"""
Sample vulnerable controller — for SecurCode scanner testing only.
Contains intentional security issues to demonstrate detection capabilities.
"""
import sqlite3
import subprocess
import pickle


def get_user(user_id: str):
    """VULNERABLE: SQL Injection via string concatenation."""
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # !! SQL Injection: never concatenate user input directly
    cursor.execute("SELECT * FROM users WHERE id = " + user_id)
    return cursor.fetchone()


def run_user_command(user_input: str):
    """VULNERABLE: Arbitrary code execution via eval()."""
    # !! Dangerous: eval() allows arbitrary code execution
    result = eval(user_input)
    return result


def execute_dynamic_code(code_string: str):
    """VULNERABLE: Code execution via exec()."""
    # !! Dangerous: exec() executes arbitrary Python code
    exec(code_string)


def run_shell(command: str):
    """VULNERABLE: Shell injection via subprocess shell=True."""
    # !! Dangerous: shell=True allows shell injection
    result = subprocess.run(command, shell=True, capture_output=True)
    return result.stdout


def load_user_data(data: bytes):
    """VULNERABLE: Insecure deserialization via pickle.loads()."""
    # !! Dangerous: pickle.loads() on untrusted data = RCE
    return pickle.loads(data)
