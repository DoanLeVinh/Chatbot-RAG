from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
except Exception:
    # Fallback to the standalone langchain_text_splitters package if available
    from langchain_text_splitters import RecursiveCharacterTextSplitter

loaders = DirectoryLoader(
    path="./papers",
    glob="**/*.pdf",
    loader_cls=UnstructuredFileLoader,
    show_progress=True,
    use_multithreading=True,
)

docs = loaders.load()

print(docs)
print(len(docs))

MARKDOWN_SEPARATORS = [
    "\n#{1,6} ",
    "```\n",
    "\n***+\n",
    "\n---+\n",
    "\n___+\n",
    "\n\n",
    "\n",
    " ",
    "",
]

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    add_start_index=True,
    strip_whitespace=True,
    separators=MARKDOWN_SEPARATORS,
)

try:
    split_docs = text_splitter.split_documents(docs)
    print(split_docs)
except Exception as e:
    import traceback
    tb = traceback.format_exc()
    # Save full traceback to a UTF-8 file for inspection
    with open(r"C:\Users\VINH\AppData\Local\Temp\chatbot_error_log.txt", "w", encoding="utf-8") as f:
        f.write(tb)
    print("An error occurred while splitting documents. Full traceback written to C:\\Users\\VINH\\AppData\\Local\\Temp\\chatbot_error_log.txt")
    sys.exit(1)
