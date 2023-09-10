from flask import Flask, render_template, request, Response, jsonify
from datetime import datetime
import openai
import json
import os

app = Flask(__name__)

def read_api_key_from_file():
    try:
        with open("openaiapikey.txt", "r") as f:
            api_key = f.read().strip()
            return api_key
    except Exception as error:
        print(f"Error reading API key from file: {error}")
        return None

openai.api_key = read_api_key_from_file()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate-schedule", methods=["POST"])
def generate_schedule():
    req_data = request.get_json()
    user_input = req_data["prompt"]
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {
                "role": "system", 
                "content": (
                    "You are an expert scheduler. The Year is 2023. Your task is to help the user plan their day. All of the responses you generate should"
                    " be in valid JSON format with strict adherence to the following example structure:"
                    " ["
                    "   {"
                    "     'day': 'YYYY-MM-DD',"
                    "     'startTime': 'HH:mm',"
                    "     'endTime': 'HH:mm',"
                    "     'title': 'event title'"
                    "   },"
                    "   ..."
                    " ]"
                    " Please do not include any additional information or commentary. Every response should only include this JSON formatted data."
                )
            },
            {"role": "user", "content": user_input}
        ],
    )

    schedule = response.choices[0].message.content.strip()
    return jsonify({"schedule": schedule})

if __name__ == "__main__":
    app.run(port=3001)