import os
import subprocess

commits = [
    # Commit 1
    ("git add backend/llm_router.py", "Fix Groq API key configuration"),
    # Commit 2
    ("git add backend/db.py", "Add document nodes DB schema"),
    # Commit 3
    ("git add backend/Chatbot.py", "Implement hierarchical tree parsing logic"),
    # Commit 4
    ("git add backend/seed_db_from_json.py backend/run_parser.py backend/migrate_db.py", "Update JSON DB seeding script"),
    # Commit 5
    ("git add backend/serve.py backend/retriever_local.py backend/build_faiss_local.py backend/test_retriever_hybrid.py", "Refactor chunk retrieval API endpoints"),
    # Commit 6
    ("git add frontend/src/web-admin/DocumentManager.tsx", "Build React tree view UI"),
    # Commit 7
    ("git add frontend/src/web-chat/ChatApp.tsx frontend/src/web-chat/ChatView.tsx frontend/src/web-chat/ReferencePanel.tsx", "Optimize RAG response time logic")
]

for add_cmd, msg in commits:
    try:
        subprocess.run(add_cmd, shell=True, check=True)
        # Check if there are any staged changes before committing
        status = subprocess.run("git diff --cached --quiet", shell=True)
        if status.returncode != 0:
            subprocess.run(f'git commit -m "{msg}"', shell=True, check=True)
            print(f"Committed: {msg}")
        else:
            print(f"No changes to commit for: {msg}")
    except Exception as e:
        print(f"Failed on commit: {msg} - {e}")

try:
    print("Pushing to main...")
    subprocess.run("git push origin main", shell=True, check=True)
    print("Pushed successfully.")
except Exception as e:
    print(f"Failed to push: {e}")
