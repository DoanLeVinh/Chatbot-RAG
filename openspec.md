OpenSpec: Customs & Import-Export RAG Chatbot

Tài liệu OpenSpec gộp 1 file cho đề tài "Xây dựng chatbot RAG tra cứu luật hải quan và xuất nhập khẩu". Gồm: bối cảnh dự án, đề xuất thay đổi, thiết kế kỹ thuật, nghiệp vụ hệ thống, đặc tả yêu cầu (spec), và checklist triển khai.

Phần 1 — Project Context
Purpose

Xây dựng chatbot RAG (Retrieval-Augmented Generation) giúp doanh nghiệp và cá nhân tra cứu nhanh các quy định pháp luật về hải quan và thủ tục xuất nhập khẩu tại Việt Nam (luật, nghị định, thông tư, quy trình khai báo hải quan...), thay vì phải tự tìm kiếm thủ công trong các văn bản pháp lý dài và phức tạp. Đây là đồ án/thực tập tốt nghiệp.

Tech Stack
Ngôn ngữ: Python 3.10+
Framework RAG: LangChain (langchain, langchain-community, langchain-core, langchain-text-splitters)
Embedding: mặc định sentence-transformers (HuggingFace, local, miễn phí, đa ngôn ngữ — hỗ trợ tiếng Việt); tùy chọn chuyển sang OpenAI Embeddings qua cấu hình
LLM sinh câu trả lời: mặc định Ollama (local, miễn phí); tùy chọn chuyển sang OpenAI Chat qua cấu hình
Vector store: FAISS (local)
Document loading: unstructured, pypdf (nguồn dữ liệu chính: PDF văn bản pháp luật)
Cấu hình: biến môi trường qua .env (python-dotenv)
Project Conventions
Code Style
Chia code theo module, mỗi file trong src/rag_chatbot/ chỉ đảm nhiệm một bước trong pipeline (load -> split -> embed -> store -> retrieve -> prompt -> generate).
Không hard-code tham số (chunk size, tên model, ngưỡng similarity...) trong logic — tất cả đọc qua config.py từ .env, có giá trị mặc định.
Comment và docstring bằng tiếng Việt vì đội ngũ phát triển và tài liệu bàn giao là tiếng Việt.
Architecture Patterns
Provider-agnostic cho embedding và LLM: embeddings.py và llm.py chọn provider (huggingface/ollama mặc định hoặc openai tùy chọn) dựa trên biến môi trường, không sửa code khi đổi provider.
data/ (nguồn PDF) tách khỏi storage/ (index FAISS sinh ra) tách khỏi src/ (code) — dữ liệu pháp lý nhạy cảm/riêng tư không lẫn vào code, và index có thể build lại bất kỳ lúc nào từ data/.
Câu trả lời luôn phải kèm trích dẫn nguồn (tên văn bản/điều khoản) để người dùng có thể tự đối chiếu — không được trả lời như một "hộp đen".
Testing Strategy
Unit test cho các bước không cần model (chunking, format nguồn) chạy nhanh, không tốn phí, không cần mạng.
Đánh giá chất lượng câu trả lời bằng bộ câu hỏi mẫu dựa trên các văn bản pháp luật thật (so sánh câu trả lời với nội dung điều khoản gốc).
Git Workflow
Không commit file PDF nguồn (data/papers/) và index sinh ra (storage/faiss_index/) — chỉ commit code, cấu hình mẫu (.env.example), và tài liệu.
Domain Context
Nguồn dữ liệu: văn bản pháp luật hải quan và xuất nhập khẩu Việt Nam (Luật Hải quan, các Nghị định/Thông tư hướng dẫn, quy trình khai báo hải quan điện tử...).
Người dùng mục tiêu: doanh nghiệp xuất nhập khẩu, nhân viên logistics/khai báo hải quan, sinh viên/người mới tìm hiểu quy trình XNK.
Yêu cầu đặc thù: câu trả lời phải bám sát văn bản gốc (không suy diễn), vì thông tin sai lệch về thủ tục hải quan có thể gây hậu quả pháp lý/tài chính cho doanh nghiệp.
Chi tiết nghiệp vụ (nhóm nghiệp vụ, actor, thuật ngữ chuyên ngành, phạm vi không hỗ trợ): xem changes/add-customs-rag-chatbot/business-context.md. Tóm tắt 7 nhóm nghiệp vụ chính hệ thống cần bao phủ: (1) phân loại hàng hóa & mã HS, (2) thủ tục khai báo hải quan, (3) thuế và các khoản phải nộp, (4) giấy phép & điều kiện XNK, (5) danh mục hàng cấm/hạn chế, (6) xử lý vi phạm & cưỡng chế hải quan, (7) hải quan điện tử VNACCS/VCIS.
Important Constraints
Không được để mô hình tự suy đoán hoặc dùng kiến thức ngoài nguồn dữ liệu đã cung cấp khi trả lời — nếu không tìm thấy thông tin trong ngữ cảnh truy xuất, chatbot phải trả lời "không biết" thay vì bịa.
Ưu tiên giải pháp chạy local/miễn phí (Ollama + sentence-transformers) để phù hợp với ngân sách đồ án; giữ khả năng chuyển sang OpenAI làm phương án so sánh/dự phòng.
External Dependencies
Ollama (https://ollama.com) — chạy LLM local.
HuggingFace Hub — tải model embedding sentence-transformers (chỉ cần mạng ở lần chạy đầu tiên).
(Tùy chọn) OpenAI API — nếu chuyển provider sang openai. -e
Phần 2 — Change Proposal: Add Customs & Import-Export RAG Chatbot
Why

Doanh nghiệp, nhân viên logistics và người mới tìm hiểu thủ tục xuất nhập khẩu hiện phải tự tra cứu thủ công trong hàng trăm trang văn bản pháp luật (Luật Hải quan, Nghị định, Thông tư...) để tìm quy định áp dụng cho tình huống cụ thể — quá trình này chậm, dễ bỏ sót điều khoản liên quan, và đòi hỏi kiến thức pháp lý chuyên môn. Một chatbot RAG cho phép đặt câu hỏi bằng ngôn ngữ tự nhiên và nhận câu trả lời được trích dẫn trực tiếp từ văn bản gốc sẽ rút ngắn đáng kể thời gian tra cứu và giảm rủi ro hiểu sai quy định.

What Changes
Thêm capability mới customs-rag-chatbot: pipeline RAG hoàn chỉnh để nạp văn bản pháp luật hải quan/XNK (PDF), chia nhỏ, embedding, lưu vector store, truy xuất ngữ cảnh liên quan, và sinh câu trả lời có trích dẫn nguồn qua giao diện dòng lệnh (CLI).
Thêm khả năng chuyển đổi provider (embedding + LLM) giữa chạy local miễn phí (sentence-transformers + Ollama, mặc định) và OpenAI (tùy chọn, trả phí) chỉ qua cấu hình .env, không sửa code.
Thêm ràng buộc trả lời có căn cứ (grounded answer): chatbot chỉ được trả lời dựa trên ngữ cảnh truy xuất được, phải trả lời "không biết" khi không tìm thấy thông tin liên quan, và phải trích dẫn nguồn cụ thể.
Impact
Affected specs: customs-rag-chatbot (capability mới, chưa tồn tại trước đó — toàn bộ requirement trong spec này là ADDED).
Affected code: dự án mới, tạo từ đầu theo cấu trúc src/rag_chatbot/ (xem design.md để biết chi tiết kiến trúc).
Không ảnh hưởng đến hệ thống nào khác vì đây là project độc lập, mới. -e
Phần 3 — Technical Design
Context

Đồ án tốt nghiệp, 2 sinh viên thực hiện, thời gian ~12 tuần. Ngân sách hạn chế nên cần giải pháp mặc định miễn phí, nhưng vẫn cần khả năng so sánh với mô hình thương mại (OpenAI) để đánh giá chất lượng trong báo cáo.

Goals / Non-Goals

Goals

Trả lời câu hỏi tiếng Việt về quy định hải quan/XNK, có trích dẫn nguồn.
Chạy được hoàn toàn local, không bắt buộc API key trả phí.
Dễ đổi provider (embedding/LLM) để làm thực nghiệm so sánh trong báo cáo.
Dễ mở rộng nguồn dữ liệu (thêm văn bản pháp luật mới) mà không đổi code.

Non-Goals

Không xây dựng giao diện web/app hoàn chỉnh trong phạm vi giai đoạn đầu (CLI trước, có thể bổ sung API/web sau — xem "Future work" trong tasks).
Không tự động cập nhật văn bản pháp luật mới từ nguồn chính thống (ra ngoài phạm vi đồ án; nạp dữ liệu là thao tác thủ công).
Không đưa ra tư vấn pháp lý mang tính khuyến nghị hành động — chatbot chỉ tra cứu và trích dẫn, không thay thế luật sư/chuyên viên hải quan.
Decisions
Decision 1: Kiến trúc pipeline chia theo module (không phải 1 script)

Mỗi bước (load, split, embed, store, retrieve, prompt, generate) là 1 module riêng trong src/rag_chatbot/, lắp ráp qua pipeline.py. Lý do: dễ test từng phần độc lập, dễ thay đổi 1 bước (vd. đổi chiến lược chunking) mà không ảnh hưởng phần còn lại, và thể hiện tư duy thiết kế phần mềm rõ ràng trong báo cáo đồ án. Alternatives considered: 1 script duy nhất (đơn giản hơn nhưng khó bảo trì, khó viết unit test, khó demo tách bạch từng bước trong báo cáo).

Decision 2: Provider embedding/LLM chọn qua config, không hard-code

embeddings.py và llm.py đọc EMBEDDING_PROVIDER / LLM_PROVIDER từ .env (huggingface/ollama mặc định, openai tùy chọn). Lý do: cho phép thực nghiệm so sánh chất lượng/tốc độ giữa mô hình local miễn phí và mô hình thương mại — dữ liệu thực nghiệm này rất có giá trị cho chương "Đánh giá" của báo cáo tốt nghiệp, đồng thời không khóa cứng dự án vào 1 nhà cung cấp. Trade-off: thêm 1 lớp trừu tượng (factory function) so với gọi thẳng API, nhưng chi phí thấp và giá trị linh hoạt cao.

Decision 3: Embedding model đa ngôn ngữ, không dùng model tiếng Anh mặc định

Mặc định sentence-transformers/paraphrase-multilingual-mpnet-base-v2 thay vì all-MiniLM-L6-v2 (chỉ tối ưu tiếng Anh). Lý do: toàn bộ văn bản pháp luật và câu hỏi người dùng đều bằng tiếng Việt; model chỉ tối ưu tiếng Anh sẽ cho chất lượng truy xuất kém hơn đáng kể với văn bản tiếng Việt.

Decision 4: Ràng buộc "grounded answer" ở tầng prompt + retriever threshold

Kết hợp 2 lớp bảo vệ chống ảo giác (hallucination):

SIMILARITY_THRESHOLD ở retriever — loại bỏ đoạn văn bản không đủ liên quan trước khi đưa vào ngữ cảnh.
Prompt template ép buộc: chỉ dùng ngữ cảnh cung cấp, trả lời "không biết" nếu không đủ thông tin, không dùng kiến thức ngoài, luôn trích dẫn nguồn khi có thể. Lý do: đây là yêu cầu bắt buộc với domain pháp luật — trả lời sai quy định hải quan có thể gây thiệt hại thực tế cho doanh nghiệp áp dụng.
Decision 5: FAISS local thay vì vector DB dịch vụ (Pinecone, Weaviate Cloud...)

Lý do: quy mô dữ liệu (văn bản pháp luật hải quan) ở mức vừa phải, phù hợp với FAISS chạy local, tránh phát sinh chi phí dịch vụ ngoài và phụ thuộc mạng khi truy vấn. Trade-off: không có sẵn khả năng scale ngang / multi-user như dịch vụ cloud — chấp nhận được cho phạm vi đồ án.

Risks / Trade-offs
Chất lượng LLM local (Ollama) có thể thấp hơn OpenAI với câu hỏi phức tạp, nhiều bước suy luận. Giảm thiểu: giữ khả năng so sánh với OpenAI qua config, chọn model Ollama phù hợp tiếng Việt (qwen2.5, vinallama) thay vì mặc định chung chung.
Văn bản pháp luật có cấu trúc phức tạp (điều/khoản/điểm lồng nhau); chunking theo ký tự đơn thuần có thể cắt ngang 1 điều luật. Giảm thiểu: ưu tiên tách theo heading Markdown-like trước khi tách theo ký tự (RecursiveCharacterTextSplitter với separator ưu tiên theo cấu trúc).
Văn bản pháp luật hết hiệu lực hoặc bị sửa đổi nhưng vẫn còn trong nguồn dữ liệu → chatbot có thể trích dẫn quy định đã lỗi thời. Giảm thiểu: ghi rõ trong tài liệu bàn giao rằng cần cập nhật data/papers/ định kỳ; đây là giới hạn được ghi nhận, không tự động giải quyết trong phạm vi đồ án.
Migration Plan

Không áp dụng — đây là hệ thống mới, không có hệ thống cũ cần migrate.

## Current System Status & Bug Fix Plan (Aug 30, 2026)

### Lỗi hiện tại (Chưa giải quyết triệt để trên máy người dùng)
Hệ thống hiển thị lỗi 401 (Unauthorized) liên tục khi Frontend gửi request `/api/sessions` và `/api/chat/stream`. 
Bên cạnh đó, các cảnh báo HTML (missing id/name/autocomplete) trên `AuthModal` vẫn còn xuất hiện ở màn hình Console. 

**Nguyên nhân gốc (Root Cause):**
Dù mã nguồn (source code) đã được vá (Fix logic Token onSuccess, Fix IDOR anonymous mode, Fix `r = get_retriever()` stream exception, Fix cảnh báo HTML), **trình duyệt của người dùng vẫn đang chạy bản cache (mã JavaScript cũ)**, do người dùng chưa Hard Reload (Ctrl + F5). Ngoài ra tiến trình Node (Vite) và Python (Uvicorn) có thể chưa kill hoàn toàn khiến code mới không được load.

### Implementation Plan (Kế hoạch Fix)
Tôi sẽ tiến hành thực hiện các bước sau hoàn toàn tự động bằng script để đảm bảo môi trường sạch 100%:
1. Dọn dẹp tiến trình: Tìm và kill tất cả các tiến trình Node.js (Vite port 3000) và Python (Uvicorn port 8000) đang chạy ẩn/treo.
2. Khởi động ngầm Backend: Gọi `python serve.py` chạy ngầm.
3. Khởi động ngầm Frontend: Gọi `npm run dev` chạy ngầm.
4. Hướng dẫn người dùng Hard-Reload: Yêu cầu người dùng thực hiện xóa Cache trình duyệt (Ctrl + F5) để ép trình duyệt tải HTML/JS mới có chứa bản vá.

Open Questions
Nguồn văn bản pháp luật chính thức nào sẽ được dùng làm dữ liệu gốc (Cổng thông tin Bộ Tài chính, Tổng cục Hải quan, Thư viện Pháp luật...)? Cần chốt trước khi bắt đầu Task 1 trong tasks.md.
Có cần hỗ trợ trích dẫn theo số điều/khoản cụ thể (thay vì chỉ tên file + vị trí ký tự) không? Nếu có, cần bổ sung bước tiền xử lý gắn metadata điều khoản khi ingest. -e
Phần 4 — Business Context (Nghiệp vụ hệ thống)

Tài liệu này mô tả chi tiết các nhóm nghiệp vụ mà chatbot cần hỗ trợ tra cứu, làm cơ sở để: (1) thu thập đúng và đủ văn bản pháp luật nguồn theo từng nhóm, (2) thiết kế bộ câu hỏi thực nghiệm/đánh giá sát với nhu cầu thực tế, (3) xác định ranh giới phạm vi trả lời của chatbot.

1. Người dùng & vai trò (Actors)
Vai trò	Nhu cầu chính	Ví dụ câu hỏi
Nhân viên khai báo hải quan / forwarder	Tra cứu nhanh quy trình, mã HS, chứng từ cần thiết cho từng lô hàng cụ thể	"Hàng dệt may xuất khẩu sang EU cần giấy tờ gì?"
Doanh nghiệp XNK (chủ hàng)	Hiểu nghĩa vụ thuế, điều kiện được phép nhập/xuất mặt hàng	"Nhập khẩu máy móc cũ có bị hạn chế không?"
Sinh viên / người mới tìm hiểu	Học quy trình, thuật ngữ, khung pháp lý tổng quan	"Quy trình thông quan hàng nhập khẩu gồm những bước nào?"
Nhân viên nội bộ doanh nghiệp logistics	Tra cứu chính sách nội bộ + đối chiếu với quy định nhà nước	"Thời hạn nộp thuế nhập khẩu là bao lâu sau khi đăng ký tờ khai?"
2. Các nhóm nghiệp vụ chính (Business Domains)
2.1 Phân loại hàng hóa & mã số HS (HS Code Classification)
Tra cứu mã HS (Harmonized System) cho một loại hàng hóa cụ thể.
Tra cứu biểu thuế xuất nhập khẩu ưu đãi/thông thường theo mã HS.
Quy tắc phân loại khi hàng hóa có thể thuộc nhiều nhóm mã (General Rules for Interpretation).
Nguồn văn bản liên quan: Biểu thuế XNK, Thông tư phân loại hàng hóa, Danh mục hàng hóa xuất nhập khẩu Việt Nam.
2.2 Thủ tục khai báo hải quan (Customs Declaration Procedures)
Quy trình khai báo hải quan điện tử (hệ thống VNACCS/VCIS).
Hồ sơ hải quan cần nộp/xuất trình theo loại hình (nhập kinh doanh, gia công, sản xuất xuất khẩu, tạm nhập tái xuất...).
Thời hạn khai báo, thời hạn nộp bổ sung chứng từ.
Quy trình kiểm tra thực tế hàng hóa (luồng xanh/vàng/đỏ).
Nguồn văn bản liên quan: Luật Hải quan, Nghị định hướng dẫn thủ tục hải quan, Thông tư quy định hồ sơ hải quan.
2.3 Thuế và các khoản phải nộp (Duties & Taxes)
Thuế nhập khẩu, thuế xuất khẩu.
Thuế giá trị gia tăng (VAT) đối với hàng nhập khẩu.
Thuế tiêu thụ đặc biệt (nếu áp dụng).
Thuế tự vệ, thuế chống bán phá giá, thuế chống trợ cấp (nếu áp dụng).
Cách tính trị giá tính thuế hải quan (trị giá giao dịch, các phương pháp xác định trị giá).
Miễn thuế, giảm thuế, hoàn thuế (ví dụ: hàng gia công, nguyên liệu sản xuất xuất khẩu, hàng tạm nhập tái xuất).
Nguồn văn bản liên quan: Luật Thuế XNK, Nghị định về trị giá hải quan, Thông tư hướng dẫn thuế.
2.4 Giấy phép & điều kiện xuất nhập khẩu (Licenses & Conditions)
Giấy phép nhập khẩu/xuất khẩu tự động và không tự động theo mặt hàng.
Giấy chứng nhận xuất xứ hàng hóa (C/O) và các mẫu C/O theo hiệp định thương mại (form D, E, AK, EUR.1...).
Kiểm tra chuyên ngành: kiểm dịch động thực vật, kiểm tra chất lượng, hợp quy, an toàn thực phẩm, tùy theo loại hàng.
Nguồn văn bản liên quan: Nghị định về quản lý ngoại thương, Thông tư của các bộ quản lý chuyên ngành (Bộ Công Thương, Bộ NN&PTNT, Bộ Y tế...).
2.5 Danh mục hàng cấm / hạn chế xuất nhập khẩu
Danh mục hàng hóa cấm xuất khẩu, cấm nhập khẩu.
Danh mục hàng hóa xuất nhập khẩu theo giấy phép hoặc điều kiện.
Hàng hóa thuộc diện quản lý đặc thù (vũ khí, tiền chất, hàng nguy hiểm, di vật cổ vật...).
Nguồn văn bản liên quan: Nghị định về danh mục hàng hóa cấm/hạn chế XNK và các phụ lục kèm theo.
2.6 Xử lý vi phạm & cưỡng chế hải quan
Các hành vi vi phạm hành chính trong lĩnh vực hải quan và mức xử phạt.
Biện pháp cưỡng chế thi hành quyết định hành chính hải quan.
Quy trình khiếu nại quyết định hải quan.
Nguồn văn bản liên quan: Nghị định xử phạt vi phạm hành chính trong lĩnh vực hải quan.
2.7 Hải quan điện tử & hệ thống VNACCS/VCIS
Quy trình đăng ký tài khoản, khai báo qua hệ thống điện tử.
Mã lỗi thường gặp và cách xử lý khi khai báo điện tử.
Nguồn văn bản liên quan: Quyết định/Thông tư hướng dẫn vận hành VNACCS/VCIS của Tổng cục Hải quan.
3. Loại văn bản pháp luật theo cấp độ hiệu lực

Cần gắn nhãn (metadata) cấp độ văn bản khi thu thập dữ liệu, vì cấp độ ảnh hưởng đến độ ưu tiên khi có mâu thuẫn nội dung giữa các văn bản:

Luật (Quốc hội ban hành) — cấp cao nhất trong phạm vi nghiệp vụ này.
Nghị định (Chính phủ ban hành) — hướng dẫn thi hành Luật.
Thông tư (Bộ ban hành) — hướng dẫn chi tiết Nghị định.
Quyết định / Công văn hướng dẫn (Tổng cục Hải quan, các Cục) — hướng dẫn nghiệp vụ cụ thể, thường có tính cập nhật cao nhưng hiệu lực pháp lý thấp hơn.

Chatbot không tự phán đoán văn bản nào "đúng hơn" khi có mâu thuẫn — chỉ trích dẫn đúng nguồn và để người dùng tự đối chiếu cấp độ hiệu lực. Đây là giới hạn được ghi nhận rõ trong design.md.

4. Thuật ngữ / từ viết tắt chuyên ngành cần hệ thống nhận diện đúng

Danh sách này dùng để kiểm thử khả năng hiểu câu hỏi có chứa thuật ngữ viết tắt (không yêu cầu chatbot giải thích ngoài ngữ cảnh dữ liệu, chỉ cần nhận diện đúng ý định câu hỏi):

HS Code — mã số phân loại hàng hóa
C/O — Certificate of Origin, giấy chứng nhận xuất xứ
VNACCS/VCIS — hệ thống thông quan hàng hóa tự động / hệ thống thông tin tình báo hải quan
CIF / FOB / EXW — điều kiện giao hàng (Incoterms), ảnh hưởng đến trị giá tính thuế
Tờ khai hải quan — chứng từ khai báo chính
Luồng xanh / vàng / đỏ — mức độ kiểm tra khi thông quan
Tạm nhập tái xuất / tạm xuất tái nhập
Gia công XNK / SXXK (sản xuất xuất khẩu)
5. Phạm vi KHÔNG hỗ trợ (Out of Scope)
Chatbot không đưa ra tư vấn pháp lý mang tính khuyến nghị hành động cụ thể cho một tình huống doanh nghiệp thực tế (ví dụ: không nói "doanh nghiệp bạn nên làm X để né thuế") — chỉ tra cứu và trích dẫn quy định.
Chatbot không tính toán số thuế cụ thể thay người dùng (vì cần dữ liệu trị giá, số lượng, tỷ giá thực tế) — chỉ trích dẫn công thức/mức thuế suất quy định trong văn bản.
Chatbot không tra cứu tình trạng tờ khai/lô hàng cụ thể của một doanh nghiệp (không tích hợp với hệ thống VNACCS thật) — chỉ trả lời dựa trên văn bản quy phạm pháp luật đã nạp.
Chatbot không thay thế văn bản gốc khi có tranh chấp pháp lý — luôn khuyến nghị người dùng đối chiếu văn bản gốc qua nguồn trích dẫn. -e
Phần 5 — Capability Spec: customs-rag-chatbot
Purpose

Capability cho phép người dùng tra cứu quy định pháp luật về hải quan và xuất nhập khẩu bằng câu hỏi ngôn ngữ tự nhiên, nhận câu trả lời được tổng hợp từ văn bản pháp luật gốc kèm trích dẫn nguồn, thông qua kiến trúc RAG (Retrieval-Augmented Generation).

ADDED Requirements
Requirement: Document Ingestion

Hệ thống SHALL nạp toàn bộ văn bản pháp luật hải quan/XNK dạng PDF từ một thư mục nguồn được cấu hình, và chuyển mỗi văn bản thành đối tượng tài liệu có kèm metadata nguồn gốc (tên file).

Scenario: Nạp thư mục có nhiều file PDF hợp lệ
WHEN thư mục nguồn chứa một hoặc nhiều file .pdf
THEN hệ thống đọc được nội dung của tất cả các file
AND mỗi tài liệu kết quả có metadata source trỏ đúng tới file PDF gốc của nó
Scenario: Thư mục nguồn không có file PDF nào
WHEN thư mục nguồn được cấu hình rỗng hoặc không tồn tại file .pdf hợp lệ
THEN hệ thống dừng lại và báo lỗi rõ ràng, hướng dẫn người dùng bỏ file PDF vào đúng thư mục trước khi chạy lại
AND hệ thống KHÔNG được tiếp tục chạy các bước sau (chunking, embedding) với tập dữ liệu rỗng
Requirement: Text Chunking

Hệ thống SHALL chia mỗi tài liệu thành các đoạn (chunk) nhỏ hơn, ưu tiên cắt theo cấu trúc văn bản (tiêu đề, đoạn) trước khi cắt theo giới hạn ký tự thuần túy, và mỗi chunk SHALL giữ lại vị trí bắt đầu trong tài liệu gốc.

Scenario: Tài liệu dài hơn kích thước chunk tối đa
WHEN một tài liệu có độ dài vượt quá CHUNK_SIZE đã cấu hình
THEN hệ thống chia tài liệu đó thành nhiều chunk, mỗi chunk có độ dài không vượt quá CHUNK_SIZE (trừ trường hợp không thể chia nhỏ hơn được nữa do không có ký tự phân tách phù hợp)
AND các chunk liên tiếp có phần chồng lấn (overlap) bằng CHUNK_OVERLAP đã cấu hình để tránh mất ngữ cảnh ở ranh giới chunk
Scenario: Truy vết vị trí gốc của chunk
WHEN một chunk được tạo ra từ quá trình chia nhỏ
THEN metadata của chunk đó SHALL chứa vị trí ký tự bắt đầu (start_index) trong tài liệu gốc
AND metadata SHALL giữ nguyên source kế thừa từ tài liệu gốc
Requirement: Embedding Generation

Hệ thống SHALL chuyển mỗi chunk văn bản thành vector số học bằng một mô hình embedding có thể cấu hình được, hỗ trợ tốt tiếng Việt.

Scenario: Embedding provider mặc định (local, miễn phí)
WHEN biến cấu hình EMBEDDING_PROVIDER không được đặt hoặc đặt là huggingface
THEN hệ thống dùng mô hình sentence-transformers chạy local để tạo embedding, không yêu cầu API key
Scenario: Embedding provider tùy chọn (OpenAI)
WHEN biến cấu hình EMBEDDING_PROVIDER được đặt là openai
THEN hệ thống dùng OpenAI Embeddings API để tạo embedding
AND hệ thống báo lỗi rõ ràng nếu thiếu OPENAI_API_KEY trong trường hợp này
Requirement: Vector Storage and Retrieval

Hệ thống SHALL lưu trữ các vector embedding trong một vector store local (FAISS), hỗ trợ lưu/nạp lại để không phải tính toán lại embedding mỗi lần chạy, và SHALL truy xuất các chunk liên quan nhất đến câu hỏi người dùng dựa trên độ tương đồng ngữ nghĩa.

Scenario: Xây dựng index lần đầu
WHEN chưa tồn tại vector store đã lưu tại đường dẫn cấu hình
THEN hệ thống thực hiện load -> chunk -> embed -> build vector store từ đầu và lưu kết quả xuống đĩa
Scenario: Tái sử dụng index đã có
WHEN đã tồn tại vector store đã lưu tại đường dẫn cấu hình
THEN hệ thống nạp lại vector store đó thay vì tính toán lại embedding cho toàn bộ tài liệu
Scenario: Truy xuất theo ngưỡng tương đồng
WHEN người dùng đặt một câu hỏi
THEN hệ thống trả về tối đa RETRIEVER_K chunk có điểm tương đồng ngữ nghĩa với câu hỏi cao nhất
AND chỉ những chunk có điểm tương đồng lớn hơn hoặc bằng SIMILARITY_THRESHOLD mới được đưa vào kết quả
Scenario: Không có chunk nào đủ liên quan
WHEN không có chunk nào trong vector store đạt ngưỡng SIMILARITY_THRESHOLD với câu hỏi
THEN hệ thống trả về ngữ cảnh rỗng cho bước sinh câu trả lời (không được tự chọn chunk có điểm thấp nhất để "cố" trả lời)
Requirement: Grounded Answer Generation

Hệ thống SHALL sinh câu trả lời chỉ dựa trên ngữ cảnh đã truy xuất được, KHÔNG được sử dụng kiến thức ngoài nguồn dữ liệu, và SHALL trả lời rằng không có đủ thông tin khi ngữ cảnh không chứa câu trả lời.

Scenario: Câu hỏi có thông tin liên quan trong dữ liệu
WHEN ngữ cảnh truy xuất chứa thông tin trả lời được câu hỏi
THEN hệ thống sinh câu trả lời dựa trên nội dung ngữ cảnh đó
AND câu trả lời không chứa thông tin mâu thuẫn với ngữ cảnh được cung cấp
Scenario: Câu hỏi không có thông tin liên quan trong dữ liệu
WHEN ngữ cảnh truy xuất rỗng hoặc không chứa thông tin liên quan đến câu hỏi
THEN hệ thống trả lời rằng không tìm thấy thông tin (ví dụ: "Tôi không biết") thay vì suy đoán hoặc bịa câu trả lời
Scenario: LLM provider mặc định (local, miễn phí)
WHEN biến cấu hình LLM_PROVIDER không được đặt hoặc đặt là ollama
THEN hệ thống dùng model chạy qua Ollama tại OLLAMA_BASE_URL đã cấu hình để sinh câu trả lời
Scenario: LLM provider tùy chọn (OpenAI)
WHEN biến cấu hình LLM_PROVIDER được đặt là openai
THEN hệ thống dùng OpenAI Chat API để sinh câu trả lời
AND hệ thống báo lỗi rõ ràng nếu thiếu OPENAI_API_KEY trong trường hợp này
Requirement: Source Citation

Mỗi câu trả lời được sinh ra SHALL đi kèm danh sách nguồn (tên văn bản và vị trí trong văn bản) đã được dùng để tạo ra câu trả lời đó, để người dùng có thể tự đối chiếu với văn bản pháp luật gốc.

Scenario: Hiển thị nguồn sau câu trả lời
WHEN hệ thống trả về câu trả lời dựa trên ngữ cảnh có ít nhất 1 chunk
THEN hệ thống hiển thị kèm danh sách các nguồn (tên file, vị trí ký tự bắt đầu) tương ứng với các chunk đã dùng
AND danh sách nguồn hiển thị riêng biệt với nội dung câu trả lời để người dùng dễ phân biệt
Scenario: Không hiển thị nguồn khi không có ngữ cảnh
WHEN không có chunk nào được truy xuất cho câu hỏi (ngữ cảnh rỗng)
THEN hệ thống không hiển thị danh sách nguồn (vì không có nguồn nào được sử dụng)
Requirement: Configurable Provider Switching

Hệ thống SHALL cho phép chuyển đổi giữa các nhà cung cấp embedding và LLM (local miễn phí hoặc OpenAI trả phí) hoàn toàn qua biến môi trường, không yêu cầu chỉnh sửa mã nguồn.

Scenario: Đổi provider không cần sửa code
WHEN người dùng thay đổi giá trị EMBEDDING_PROVIDER và/hoặc LLM_PROVIDER trong file cấu hình .env
THEN hệ thống sử dụng provider mới ở lần chạy tiếp theo mà không cần sửa bất kỳ file mã nguồn nào
Scenario: Tham số pipeline có thể tùy chỉnh
WHEN người dùng thay đổi các tham số CHUNK_SIZE, CHUNK_OVERLAP, RETRIEVER_K, SIMILARITY_THRESHOLD, TEMPERATURE trong .env
THEN hệ thống áp dụng giá trị mới ở lần build/chạy tiếp theo
AND hệ thống dùng giá trị mặc định hợp lý nếu một tham số không được đặt trong .env
Requirement: Business Domain Coverage

Bộ dữ liệu nguồn và câu trả lời của hệ thống SHALL bao phủ đủ 7 nhóm nghiệp vụ hải quan/XNK được xác định trong business-context.md: (1) phân loại hàng hóa & mã HS, (2) thủ tục khai báo hải quan, (3) thuế và các khoản phải nộp, (4) giấy phép & điều kiện XNK, (5) danh mục hàng cấm/hạn chế, (6) xử lý vi phạm & cưỡng chế hải quan, (7) hải quan điện tử VNACCS/VCIS.

Scenario: Câu hỏi thuộc nhóm nghiệp vụ đã có dữ liệu
WHEN người dùng đặt câu hỏi thuộc 1 trong 7 nhóm nghiệp vụ đã liệt kê và văn bản pháp luật tương ứng đã được nạp vào data/papers/
THEN hệ thống trả lời được câu hỏi dựa trên văn bản đó kèm trích dẫn nguồn
Scenario: Câu hỏi thuộc nhóm nghiệp vụ chưa có dữ liệu nguồn
WHEN người dùng đặt câu hỏi thuộc 1 trong 7 nhóm nghiệp vụ nhưng văn bản pháp luật tương ứng CHƯA được nạp vào hệ thống
THEN hệ thống trả lời rằng không tìm thấy thông tin (theo Requirement "Grounded Answer Generation"), KHÔNG được suy diễn từ nhóm nghiệp vụ khác có dữ liệu để "đoán" câu trả lời
Requirement: Domain Terminology Recognition

Hệ thống SHALL hiểu đúng ý định câu hỏi có chứa thuật ngữ/từ viết tắt chuyên ngành hải quan phổ biến (HS Code, C/O, VNACCS/VCIS, CIF/FOB/EXW, tờ khai hải quan, luồng xanh/vàng/đỏ, tạm nhập tái xuất, gia công XNK/SXXK) khi các thuật ngữ này xuất hiện trong ngữ cảnh đã truy xuất.

Scenario: Câu hỏi dùng từ viết tắt chuyên ngành
WHEN câu hỏi của người dùng chứa một từ viết tắt chuyên ngành nằm trong danh sách thuật ngữ ở business-context.md (ví dụ: "C/O form D là gì?")
THEN hệ thống truy xuất đúng các chunk liên quan đến thuật ngữ đó (không bỏ sót do coi từ viết tắt là nhiễu) và sinh câu trả lời phù hợp
Requirement: Answer Scope Boundaries

Hệ thống SHALL từ chối hoặc giới hạn phạm vi trả lời đối với các loại yêu cầu nằm ngoài phạm vi nghiệp vụ đã xác định trong business-context.md (mục 5 - Out of Scope), thay vì cố gắng trả lời vượt quá khả năng xác thực của dữ liệu.

Scenario: Yêu cầu tư vấn hành động cụ thể cho tình huống doanh nghiệp
WHEN người dùng yêu cầu chatbot khuyến nghị một hành động cụ thể cho tình huống doanh nghiệp của họ (ví dụ: "công ty tôi nên làm gì để giảm thuế nhập khẩu lô hàng này")
THEN hệ thống chỉ trích dẫn quy định liên quan (mức thuế suất, điều kiện miễn/giảm thuế theo văn bản), KHÔNG đưa ra khuyến nghị hành động cụ thể mang tính tư vấn pháp lý
Scenario: Yêu cầu tính số thuế cụ thể
WHEN người dùng yêu cầu chatbot tính ra một số tiền thuế cụ thể cho lô hàng của họ
THEN hệ thống trích dẫn công thức/thuế suất quy định trong văn bản nguồn, và nêu rõ rằng số tiền thực tế cần được tính dựa trên trị giá, số lượng, tỷ giá cụ thể mà hệ thống không có dữ liệu để tự tính
AND hệ thống KHÔNG tự đưa ra một con số cụ thể không có căn cứ từ dữ liệu đầu vào của người dùng
Scenario: Yêu cầu tra cứu tình trạng tờ khai/lô hàng thực tế
WHEN người dùng hỏi về tình trạng xử lý của một tờ khai hải quan cụ thể hoặc lô hàng thực tế (dữ liệu cần tra cứu trong hệ thống VNACCS thật)
THEN hệ thống trả lời rằng chức năng này nằm ngoài phạm vi (hệ thống chỉ tra cứu văn bản quy phạm pháp luật, không kết nối hệ thống nghiệp vụ hải quan thực tế của cơ quan hải quan)
Requirement: Interactive CLI

Hệ thống SHALL cung cấp giao diện dòng lệnh cho phép người dùng đặt nhiều câu hỏi liên tiếp trong một phiên làm việc và thoát chương trình theo yêu cầu.

Scenario: Đặt câu hỏi và nhận câu trả lời
WHEN người dùng nhập một câu hỏi không rỗng tại dấu nhắc CLI
THEN hệ thống hiển thị câu trả lời kèm nguồn trích dẫn (nếu có) ngay sau đó
AND hệ thống quay lại dấu nhắc để nhận câu hỏi tiếp theo
Scenario: Thoát chương trình
WHEN người dùng nhập lệnh thoát (exit, quit, hoặc thoat)
THEN hệ thống kết thúc vòng lặp hỏi-đáp và dừng chương trình một cách an toàn
Scenario: Nhập rỗng
WHEN người dùng nhấn Enter mà không nhập nội dung câu hỏi
THEN hệ thống bỏ qua và quay lại dấu nhắc mà không gọi mô hình (tránh tốn tài nguyên/chi phí không cần thiết) -e
Phần 6 — Implementation Tasks

Nhóm task theo giai đoạn, tương ứng với các chương trong đề cương thực tập tốt nghiệp (đặt vấn đề -> cơ sở lý thuyết -> khảo sát hiện trạng -> thiết kế hệ thống -> hiện thực/kiểm thử -> kết luận).

1. Chuẩn bị dữ liệu & môi trường
 1.1 Chốt nguồn văn bản pháp luật chính thức sẽ thu thập (xem Open Question trong design.md)
 1.2 Thu thập và chuyển các văn bản (Luật Hải quan, Nghị định, Thông tư liên quan XNK) sang định dạng PDF, đặt vào data/papers/, đảm bảo bao phủ đủ 7 nhóm nghiệp vụ trong business-context.md (mục 2): phân loại hàng hóa/mã HS, thủ tục khai báo, thuế, giấy phép/điều kiện XNK, hàng cấm/hạn chế, xử lý vi phạm, VNACCS/VCIS
 1.2b Gắn nhãn cấp độ hiệu lực văn bản (Luật/Nghị định/Thông tư/Quyết định-Công văn) vào tên file hoặc metadata khi thu thập, theo business-context.md mục 3
 1.3 Cài Ollama, tải model (ollama pull llama3.1 hoặc model tiếng Việt tốt hơn như qwen2.5)
 1.4 Cài đặt Python environment, pip install -r requirements.txt
 1.5 Tạo .env từ .env.example, xác nhận chạy được với dữ liệu mẫu nhỏ (1-2 file PDF)
2. Document Ingestion (Requirement: Document Ingestion)
 2.1 Cài đặt loaders.py - đọc toàn bộ PDF trong data/papers/
 2.2 Xử lý trường hợp thư mục rỗng / không có PDF hợp lệ - báo lỗi rõ ràng thay vì chạy tiếp với dữ liệu rỗng
 2.3 Kiểm thử thủ công với bộ văn bản pháp luật thật (không phải file PDF fake) để phát hiện vấn đề encoding/OCR nếu văn bản là scan
3. Chunking (Requirement: Text Chunking)
 3.1 Cài đặt splitters.py với separator ưu tiên theo cấu trúc văn bản pháp luật (heading, điều/khoản) trước khi cắt theo ký tự
 3.2 Thực nghiệm với vài giá trị CHUNK_SIZE/CHUNK_OVERLAP khác nhau trên văn bản luật thật, chọn giá trị không cắt ngang 1 điều luật
 3.3 Viết unit test xác nhận: chunk không vượt kích thước cấu hình, có start_index, giữ đúng source
4. Embedding & Vector Store (Requirements: Embedding Generation, Vector

Storage and Retrieval)

 4.1 Cài đặt embeddings.py với provider mặc định sentence-transformers (đa ngôn ngữ)
 4.2 Cài đặt vectorstore.py - build/save/load FAISS, hàm build_retriever với search_type=similarity_score_threshold
 4.3 Kiểm thử: build index từ bộ dữ liệu thật, xác nhận build lại từ index đã lưu không tính toán lại embedding
 4.4 Thực nghiệm chọn RETRIEVER_K và SIMILARITY_THRESHOLD phù hợp (đánh giá qua các câu hỏi mẫu, xem mục 8)
5. Prompt & Answer Generation (Requirements: Grounded Answer Generation,

Source Citation)

 5.1 Thiết kế CHATBOT_TEMPLATE trong prompts.py với 4 ràng buộc: chỉ dùng ngữ cảnh, trả lời "không biết" khi thiếu thông tin, không dùng kiến thức ngoài, trích dẫn nguồn khi có thể
 5.2 Cài đặt llm.py với provider mặc định Ollama
 5.3 Cài đặt chain.py ghép retriever -> prompt -> llm -> parser, và get_sources_for_query để lấy danh sách nguồn hiển thị riêng
 5.4 Kiểm thử case "không có thông tin liên quan" - xác nhận chatbot trả lời "không biết", không bịa
6. Provider Switching (Requirement: Configurable Provider Switching)
 6.1 Cài đặt config.py đọc toàn bộ tham số từ .env với giá trị mặc định hợp lý
 6.2 Xác nhận đổi EMBEDDING_PROVIDER=openai / LLM_PROVIDER=openai hoạt động đúng khi có OPENAI_API_KEY, và báo lỗi rõ ràng khi thiếu key
 6.3 Viết hướng dẫn đổi provider trong README.md
7. CLI (Requirement: Interactive CLI)
 7.1 Cài đặt cli.py - vòng lặp hỏi đáp, lệnh thoát, bỏ qua input rỗng
 7.2 Cài đặt run.py làm entry point ở gốc project
 7.3 Kiểm thử trải nghiệm end-to-end: hỏi nhiều câu liên tiếp, thoát đúng cách
8. Đánh giá chất lượng (phục vụ chương "Kiểm thử & Đánh giá")
 8.1 Xây bộ câu hỏi mẫu (ví dụ 30-50 câu, rải đều cả 7 nhóm nghiệp vụ trong business-context.md mục 2) dựa trên nội dung thật của văn bản pháp luật đã nạp, có đáp án tham chiếu
 8.1b Bổ sung câu hỏi kiểm thử ranh giới phạm vi (Requirement "Answer Scope Boundaries"): câu hỏi xin tư vấn hành động cụ thể, câu hỏi yêu cầu tính thuế cụ thể, câu hỏi tra cứu tờ khai thực tế — xác nhận chatbot từ chối đúng cách thay vì trả lời vượt phạm vi
 8.2 Đánh giá độ chính xác câu trả lời so với đáp án tham chiếu (thủ công hoặc bán tự động)
 8.3 So sánh chất lượng/tốc độ giữa provider local (Ollama + sentence-transformers) và OpenAI trên cùng bộ câu hỏi mẫu
 8.4 Ghi nhận các trường hợp trả lời sai/thiếu để đưa vào phần hạn chế của báo cáo
9. Tài liệu & bàn giao
 9.1 Hoàn thiện README.md: cài đặt, chạy, đổi provider, cấu trúc thư mục
 9.2 Viết hướng dẫn cập nhật dữ liệu (thêm văn bản pháp luật mới vào data/papers/ và build lại index)
 9.3 Tổng hợp kết quả thực nghiệm (mục 8) vào báo cáo tốt nghiệp

Phần 7 — Trạng Thái Triển Khai Thực Tế (Implementation Milestone Completed)

1. Giao Diện & Trải Nghiệm Người Dùng (Frontend):
 - Web Chatbot hiện đại với React 18 + TypeScript + Vite + Tailwind/Modern CSS.
 - Hỗ trợ SSE Streaming Markdown thời gian thực, bảng thuế suất, phân tích mã HS, đề xuất câu hỏi gợi ý và xuất báo cáo PDF.
 - Trang Quản trị Admin (/admin/documents) với tính năng quản lý danh mục văn bản, duyệt cây phân cấp Chương/Điều/Khoản, và nút bấm "⚡ Đồng bộ tất cả PDF" tự động.

2. Pipeline Ingestion & Vector Store (Backend):
 - Hai tầng phân cấp (Two-Tier Parent-Child Chunking): 1.171 Parent Chunks (Chương/Điều/Khoản) + 9.228 Child Chunks (Embeddings).
 - Lưu trữ toàn bộ 22 văn bản pháp luật trong papers/ vào SQLite (documents, document_nodes, document_parent_chunks).
 - Vector Store FAISS FlatIP 768 chiều (sentence-transformers/paraphrase-multilingual-mpnet-base-v2) kết hợp SQLite Embeddings Cache (18.241 bản ghi).

3. Kiến Trúc Truy Xuất & Sinh Phản Hồi (RAG & LLM Router):
 - Hybrid Search: FAISS Dense Vector Search + BM25 Sparse Search + Reciprocal Rank Fusion (RRF).
 - Reranking: BAAI/bge-reranker-base Cross-Encoder.
 - Parent-Child Context Expansion: Tự động ánh xạ từ child chunks sang parent context đầy đủ trước khi cấp cho LLM.
 - LLM Router đa tầng với cơ chế dự phòng failover thông minh: Groq -> OpenRouter -> Gemini -> Local Ollama (llama3.2).

4. Bảo Mật, Phân Quyền & Kiểm Thử Tự Động:
 - Xác thực PBKDF2 HMAC SHA-256 (100.000 vòng lặp) + JSON Web Token (JWT).
 - Kiểm soát IDOR nghiêm ngặt, cách ly dữ liệu lịch sử chat giữa các người dùng.
 - Bộ kiểm thử tự động toàn diện (test_rigorous_auth_and_chat.py): 31/31 bài test vượt qua (100% Pass Rate).

Phần 8 — Báo Cáo Hiện Trạng Toàn Diện Của Hệ Thống (System Health & Architecture Current State)

1. Cấu Trúc Phân Cấp Dữ Liệu 4 Tầng (Hierarchical Chunks Tree):
 - Cơ sở dữ liệu SQLite bảng `document_nodes` chứa 4.191 nodes phân cấp chi tiết:
   + 88 Chương (chuong - Root Level)
   + 93 Mục & 15 Tiểu mục (muc, tieu_muc - Sub-level 1)
   + 979 Điều luật (dieu - Sub-level 2)
   + 2.896 Khoản quy định (khoan - Sub-level 3, chứa toàn văn nội dung quy phạm)
   + 70 Phụ lục & 32 Mẫu biểu (phu_luc, mau_so)
 - Giao diện Quản lý Tài liệu (/admin/documents): Cung cấp component đệ quy TreeNode cho phép Admin duyệt cây phân cấp trực quan, mở rộng từng Chương -> Mục -> Điều -> Khoản, chỉnh sửa hoặc xóa từng node độc lập.

2. Cơ Chế Khởi Động Bất Đồng Bộ & Tối Ưu Nạp Mô Hình (Non-blocking Fast Startup):
 - Backend (`backend/serve.py`) khởi tạo cơ sở dữ liệu `db.init_db()` tức thì và nạp mô hình nặng (`SentenceTransformer`, `BGE-Reranker`, `BM25`) trong worker thread (`asyncio.to_thread`).
 - Cổng port 8000 được bind và lắng nghe ngay lập tức (< 1 giây) mà không bị block event loop.
 - Bật cờ môi trường `HF_HUB_OFFLINE=1` và `TRANSFORMERS_OFFLINE=1` nạp model từ bộ nhớ đệm cục bộ, loại bỏ hoàn toàn độ trễ mạng từ HuggingFace Hub.

3. Độ Tin Cậy Của Luồng Streaming AI (Resilient Server-Sent Events):
 - Endpoint `POST /api/chat/stream` đã được chuẩn hóa toàn diện với khối `try...except` và cơ chế fallback tự động.
 - Đã xử lý triệt để các lỗi kết nối, module imports (`asyncio`), và mapping thuộc tính `agent.rag_pipeline.retriever`.
 - Truyền tải mượt mà từng token phản hồi kèm trạng thái pipeline (🔍 Tìm kiếm -> ⚖️ Phân tích -> ✍️ Tổng hợp), trích xuất mã HS, bảng thuế suất, và danh mục căn cứ pháp lý chính xác.

4. Quản Lý Hạn Mức Sử Dụng Thời Gian Thực (Real-time Quota & Usage Sync):
 - Tự động đồng bộ số lượng tin nhắn (`/api/user/usage`) ngay khi bot hoàn tất câu trả lời và khi tải ảnh thành công.
 - Sidebar hiển thị trực quan gói dịch vụ (Gói Miễn phí / Logi Pro), số tin nhắn trong ngày (`0/10` -> `1/10` -> `2/10`), số lượt tải ảnh (`0/5`), và thanh tiến trình trực quan.

5. Danh Mục Dịch Vụ Đang Chạy Nền (Live Daemon Processes):
 - Frontend Web Application: `http://localhost:3000` (React 18 + Vite Dev Server).
 - Backend REST & SSE API: `http://127.0.0.1:8000` (FastAPI / Uvicorn Engine).
 - AI Inference Engine: `http://localhost:11434` (Ollama với mô hình `llama3.2` và `qwen2.5:3b`).

6. Độ Chuẩn Xác Mã Nguồn & Kiểm Thử:
 - TypeScript Compiler (`tsc --noEmit`): 0 lỗi, 0 cảnh báo.
 - Backend Integration & Security Tests (`test_rigorous_auth_and_chat.py` + `test_quiz_service.py`): 36/36 bài test Passed (100% Pass Rate).

======================================================================
9. KIẾN TRÚC TÍNH NĂNG SINH ĐỀ & LÀM BÀI TRẮC NGHIỆM TỰ ĐỘNG (IN-CHAT AI QUIZ GENERATOR)
======================================================================

1. Luồng Hoạt Động Cốt Lõi (End-to-End Conversational Quiz Workflow):
 - Bước 1: Người dùng yêu cầu sinh trắc nghiệm tự nhiên trong khung chat (VD: "Tạo 10 câu trắc nghiệm về Luật Hải quan cho tôi" hoặc "Sinh đề trắc nghiệm từ file tài liệu vừa tải lên").
 - Bước 2: `backend/quiz_service.py` nhận diện ý định (`is_quiz_intent`) và trích xuất tham số (`extract_quiz_params` gồm số lượng câu, độ khó, thời gian làm bài).
 - Bước 3: RAG pipeline trích xuất điều khoản pháp lý liên quan từ Vector Tree 22 văn bản Luật Hải quan (hoặc Scoped Document Chunks trong phiên).
 - Bước 4: LLM Router sinh bộ câu hỏi trắc nghiệm A/B/C/D chuẩn định dạng JSON Schema kèm đáp án đúng, giải thích chuyên sâu và số hiệu Điều luật căn cứ.
 - Bước 5: Backend lưu trữ đề thi vào các bảng `quizzes`, `quiz_questions` và đính kèm `quiz_json` vào tin nhắn AI trong SQLite.
 - Bước 6: Khung chat hiển thị In-Chat Quiz Card (`[🚀 Bắt đầu làm bài]`).
 - Bước 7: Người dùng bấm vào nút sẽ mở modal tương tác `QuizRunnerModal.tsx` để làm bài (đồng hồ đếm ngược, chọn A/B/C/D, danh sách câu hỏi điều hướng, xác nhận nộp bài).
 - Bước 8: Hệ thống chấm điểm tự động (`POST /api/quiz/{id}/submit`), lưu kết quả vào `quiz_submissions`, hiển thị điểm số %, tỷ lệ đúng/sai và chế độ xem lại chi tiết kèm căn cứ pháp lý.

2. Cấu Trúc Cơ Sở Dữ Liệu SQLite cho Trắc Nghiệm:
 - `quizzes`: `id`, `session_id`, `user_id`, `title`, `topic`, `source_type` ('law_database' | 'document_upload'), `source_name`, `total_questions`, `time_limit_minutes`, `difficulty`, `created_at`.
 - `quiz_questions`: `id`, `quiz_id`, `question_index`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `explanation`, `citation_code`, `created_at`.
 - `quiz_submissions`: `id`, `quiz_id`, `user_id`, `score`, `total_correct`, `total_questions`, `answers_json`, `time_spent_seconds`, `completed_at`.
 - `messages`: Cột `quiz_json` lưu trữ thông tin tóm tắt đề thi hiển thị trực tiếp trong card.

3. Tiêu Chuẩn Bảo Mật:
 - `GET /api/quiz/{quiz_id}`: Tuyệt đối ẩn `correct_option` và `explanation` trước khi nộp bài để chống gian lận.
 - `POST /api/quiz/{quiz_id}/submit`: Đánh giá câu trả lời trên server, tính điểm và trả về toàn bộ đáp án chính xác kèm giải thích chi tiết.
 - `GET /api/quiz/history`: Bảo vệ theo tài khoản người dùng đã xác thực.