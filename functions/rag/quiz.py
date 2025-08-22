import functions_framework
from firebase_functions import https_fn
from firebase_admin import firestore
import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Any
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import Chroma
import random

# Initialize Firestore
db = firestore.client()

# Initialize Gemini components
llm = ChatGoogleGenerativeAI(
    model="gemini-pro",
    google_api_key=os.getenv('GOOGLE_API_KEY')
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=os.getenv('GOOGLE_API_KEY')
)

@functions_framework.http
def generate_quiz(request: https_fn.Request) -> https_fn.Response:
    """
    Generate a quiz based on document content
    """
    try:
        request_json = request.get_json()
        
        if not request_json:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                mimetype="application/json"
            )
        
        document_id = request_json.get('document_id')
        quiz_type = request_json.get('quiz_type', 'multiple_choice')  # multiple_choice, true_false, short_answer
        num_questions = request_json.get('num_questions', 5)
        difficulty = request_json.get('difficulty', 'medium')  # easy, medium, hard
        
        if not document_id:
            return https_fn.Response(
                json.dumps({"error": "Missing document_id parameter"}),
                status=400,
                mimetype="application/json"
            )
        
        # Get document chunks from ChromaDB
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        docs = vectorstore.get(
            where={"doc_id": document_id}
        )
        
        if not docs['documents']:
            return https_fn.Response(
                json.dumps({"error": "Document not found"}),
                status=404,
                mimetype="application/json"
            )
        
        # Combine all chunks
        full_text = "\n\n".join(docs['documents'])
        
        # Generate quiz based on type
        if quiz_type == "multiple_choice":
            quiz = generate_multiple_choice_quiz(full_text, num_questions, difficulty)
        elif quiz_type == "true_false":
            quiz = generate_true_false_quiz(full_text, num_questions, difficulty)
        elif quiz_type == "short_answer":
            quiz = generate_short_answer_quiz(full_text, num_questions, difficulty)
        else:
            return https_fn.Response(
                json.dumps({"error": "Invalid quiz type"}),
                status=400,
                mimetype="application/json"
            )
        
        # Store quiz in Firestore
        quiz_ref = db.collection('quizzes').document()
        quiz_ref.set({
            'document_id': document_id,
            'quiz_type': quiz_type,
            'difficulty': difficulty,
            'num_questions': num_questions,
            'quiz': quiz,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "document_id": document_id,
                "quiz_type": quiz_type,
                "difficulty": difficulty,
                "quiz": quiz
            }),
            status=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            mimetype="application/json"
        )

def generate_multiple_choice_quiz(text: str, num_questions: int, difficulty: str) -> Dict[str, Any]:
    """
    Generate multiple choice questions using Gemini
    """
    difficulty_prompt = {
        "easy": "Create easy questions that test basic understanding",
        "medium": "Create moderate questions that test comprehension and application",
        "hard": "Create challenging questions that test deep understanding and analysis"
    }
    
    prompt = f"""Based on the following text, create {num_questions} multiple choice questions with 4 options each.
    {difficulty_prompt.get(difficulty, difficulty_prompt['medium'])}
    
    Format each question as:
    Question X: [question text]
    A) [option A]
    B) [option B]
    C) [option C]
    D) [option D]
    Correct Answer: [A/B/C/D]
    Explanation: [brief explanation of why this is correct]
    
    Text:
    {text}
    
    Questions:"""
    
    response = llm.invoke(prompt)
    response_text = response.content
    
    # Parse the response into structured format
    questions = parse_multiple_choice_response(response_text, num_questions)
    
    return {
        "type": "multiple_choice",
        "difficulty": difficulty,
        "questions": questions
    }

def generate_true_false_quiz(text: str, num_questions: int, difficulty: str) -> Dict[str, Any]:
    """
    Generate true/false questions using Gemini
    """
    difficulty_prompt = {
        "easy": "Create straightforward true/false statements",
        "medium": "Create statements that require careful reading",
        "hard": "Create complex statements that test deep understanding"
    }
    
    prompt = f"""Based on the following text, create {num_questions} true/false questions.
    {difficulty_prompt.get(difficulty, difficulty_prompt['medium'])}
    
    Format each question as:
    Question X: [statement]
    Answer: [True/False]
    Explanation: [brief explanation]
    
    Text:
    {text}
    
    Questions:"""
    
    response = llm.invoke(prompt)
    response_text = response.content
    
    # Parse the response into structured format
    questions = parse_true_false_response(response_text, num_questions)
    
    return {
        "type": "true_false",
        "difficulty": difficulty,
        "questions": questions
    }

def generate_short_answer_quiz(text: str, num_questions: int, difficulty: str) -> Dict[str, Any]:
    """
    Generate short answer questions using Gemini
    """
    difficulty_prompt = {
        "easy": "Create simple questions that can be answered in 1-2 sentences",
        "medium": "Create questions that require explanation in 2-3 sentences",
        "hard": "Create complex questions that require detailed analysis"
    }
    
    prompt = f"""Based on the following text, create {num_questions} short answer questions.
    {difficulty_prompt.get(difficulty, difficulty_prompt['medium'])}
    
    Format each question as:
    Question X: [question]
    Sample Answer: [expected answer]
    Key Points: [key points that should be included]
    
    Text:
    {text}
    
    Questions:"""
    
    response = llm.invoke(prompt)
    response_text = response.content
    
    # Parse the response into structured format
    questions = parse_short_answer_response(response_text, num_questions)
    
    return {
        "type": "short_answer",
        "difficulty": difficulty,
        "questions": questions
    }

def parse_multiple_choice_response(response: str, num_questions: int) -> List[Dict[str, Any]]:
    """
    Parse the LLM response into structured multiple choice questions
    """
    questions = []
    lines = response.split('\n')
    current_question = {}
    
    for line in lines:
        line = line.strip()
        if line.startswith('Question'):
            if current_question:
                questions.append(current_question)
            current_question = {'question': line.split(':', 1)[1].strip() if ':' in line else ''}
        elif line.startswith(('A)', 'B)', 'C)', 'D)')):
            if 'options' not in current_question:
                current_question['options'] = {}
            option_letter = line[0]
            option_text = line[2:].strip()
            current_question['options'][option_letter] = option_text
        elif line.startswith('Correct Answer:'):
            current_question['correct_answer'] = line.split(':', 1)[1].strip()
        elif line.startswith('Explanation:'):
            current_question['explanation'] = line.split(':', 1)[1].strip()
    
    if current_question:
        questions.append(current_question)
    
    return questions[:num_questions]

def parse_true_false_response(response: str, num_questions: int) -> List[Dict[str, Any]]:
    """
    Parse the LLM response into structured true/false questions
    """
    questions = []
    lines = response.split('\n')
    current_question = {}
    
    for line in lines:
        line = line.strip()
        if line.startswith('Question'):
            if current_question:
                questions.append(current_question)
            current_question = {'question': line.split(':', 1)[1].strip() if ':' in line else ''}
        elif line.startswith('Answer:'):
            current_question['answer'] = line.split(':', 1)[1].strip()
        elif line.startswith('Explanation:'):
            current_question['explanation'] = line.split(':', 1)[1].strip()
    
    if current_question:
        questions.append(current_question)
    
    return questions[:num_questions]

def parse_short_answer_response(response: str, num_questions: int) -> List[Dict[str, Any]]:
    """
    Parse the LLM response into structured short answer questions
    """
    questions = []
    lines = response.split('\n')
    current_question = {}
    
    for line in lines:
        line = line.strip()
        if line.startswith('Question'):
            if current_question:
                questions.append(current_question)
            current_question = {'question': line.split(':', 1)[1].strip() if ':' in line else ''}
        elif line.startswith('Sample Answer:'):
            current_question['sample_answer'] = line.split(':', 1)[1].strip()
        elif line.startswith('Key Points:'):
            current_question['key_points'] = line.split(':', 1)[1].strip()
    
    if current_question:
        questions.append(current_question)
    
    return questions[:num_questions]

@functions_framework.http
def grade_quiz(request: https_fn.Request) -> https_fn.Response:
    """
    Grade a quiz submission
    """
    try:
        request_json = request.get_json()
        
        if not request_json:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                mimetype="application/json"
            )
        
        quiz_id = request_json.get('quiz_id')
        answers = request_json.get('answers', {})
        
        if not quiz_id:
            return https_fn.Response(
                json.dumps({"error": "Missing quiz_id parameter"}),
                status=400,
                mimetype="application/json"
            )
        
        # Get quiz from Firestore
        quiz_doc = db.collection('quizzes').document(quiz_id).get()
        
        if not quiz_doc.exists:
            return https_fn.Response(
                json.dumps({"error": "Quiz not found"}),
                status=404,
                mimetype="application/json"
            )
        
        quiz_data = quiz_doc.to_dict()
        quiz_questions = quiz_data['quiz']['questions']
        
        # Grade the answers
        results = grade_answers(quiz_questions, answers, quiz_data['quiz']['type'])
        
        # Store results in Firestore
        result_ref = db.collection('quiz_results').document()
        result_ref.set({
            'quiz_id': quiz_id,
            'answers': answers,
            'results': results,
            'score': results['score'],
            'total_questions': results['total_questions'],
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "results": results
            }),
            status=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            mimetype="application/json"
        )

def grade_answers(questions: List[Dict], answers: Dict, quiz_type: str) -> Dict[str, Any]:
    """
    Grade quiz answers
    """
    correct_count = 0
    total_questions = len(questions)
    detailed_results = []
    
    for i, question in enumerate(questions):
        question_num = str(i + 1)
        user_answer = answers.get(question_num, '')
        
        if quiz_type == "multiple_choice":
            is_correct = user_answer == question.get('correct_answer', '')
        elif quiz_type == "true_false":
            is_correct = user_answer.lower() == question.get('answer', '').lower()
        else:  # short_answer
            # For short answer, we'll need more sophisticated grading
            is_correct = grade_short_answer(user_answer, question)
        
        if is_correct:
            correct_count += 1
        
        detailed_results.append({
            'question': question_num,
            'user_answer': user_answer,
            'correct_answer': question.get('correct_answer') or question.get('answer', ''),
            'is_correct': is_correct,
            'explanation': question.get('explanation', '')
        })
    
    score = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    
    return {
        'score': score,
        'correct_count': correct_count,
        'total_questions': total_questions,
        'detailed_results': detailed_results
    }

def grade_short_answer(user_answer: str, question: Dict) -> bool:
    """
    Grade short answer questions using Gemini
    """
    key_points = question.get('key_points', '')
    sample_answer = question.get('sample_answer', '')
    
    prompt = f"""Grade the following short answer question:

Question: {question.get('question', '')}
Sample Answer: {sample_answer}
Key Points: {key_points}
Student Answer: {user_answer}

Rate the answer as correct (True) or incorrect (False) based on whether it demonstrates understanding of the key concepts.

Answer (True/False):"""
    
    response = llm.invoke(prompt)
    return 'true' in response.content.lower()

# For local testing
if __name__ == "__main__":
    # Test the quiz generation function
    test_text = "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed."
    print("Testing quiz generation functionality...")
