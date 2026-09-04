"""
Module: Curated Customs Quiz Bank (Ngân hàng câu hỏi nghiệp vụ Hải quan & XNK chuẩn)
Chuyên nghiệp, chính xác 100% căn cứ pháp lý, phân loại thành 8 chuyên đề nghiệp vụ.
"""

CURATED_CUSTOMS_QUIZ_BANK = [
    # =========================================================================
    # CHUYÊN ĐỀ 1: QUY TẮC XUẤT XỨ HÀNG HÓA (C/O)
    # =========================================================================
    {
        "question": "Tiêu chí xuất xứ 'WO' (Wholly Obtained) trên Giấy chứng nhận xuất xứ hàng hóa (C/O) có ý nghĩa pháp lý gì?",
        "options": {
            "A": "Hàng hóa có xuất xứ thuần túy hoặc được thu hoạch, sản xuất toàn bộ tại một quốc gia thành viên",
            "B": "Hàng hóa có hàm lượng giá trị khu vực đạt tối thiểu 40% tính theo công thức gián tiếp",
            "C": "Hàng hóa có sự chuyển đổi mã số phân loại hàng hóa ở cấp độ 4 số (CTH)",
            "D": "Hàng hóa được sản xuất từ 100% nguyên liệu nhập khẩu ngoài khối hiệp định"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 6 Nghị định 31/2018/NĐ-CP, tiêu chí WO (Wholly Obtained) áp dụng cho hàng hóa có xuất xứ thuần túy như khoáng sản khai thác, nông sản thu hoạch, động vật sống sinh ra và nuôi dưỡng tại nước thành viên.",
        "citation_code": "Điều 6 Nghị định 31/2018/NĐ-CP",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Trong các hiệp định thương mại tự do (FTA), tiêu chí 'CTH' (Change in Tariff Heading) đòi hỏi sự chuyển đổi mã HS như thế nào?",
        "options": {
            "A": "Chuyển đổi mã số hàng hóa ở cấp độ 4 số giữa nguyên liệu đầu vào và thành phẩm xuất khẩu",
            "B": "Chuyển đổi mã số hàng hóa ở cấp độ 2 số (Chương - Change in Chapter)",
            "C": "Chuyển đổi mã số hàng hóa ở cấp độ 6 số (Phân nhóm - Change in Tariff Sub-heading)",
            "D": "Không được phép thay đổi bất kỳ mã số HS nào trong quá trình gia công, chế biến"
        },
        "correct_option": "A",
        "explanation": "Theo quy tắc xuất xứ cụ thể mặt hàng (PSR) tại Nghị định 31/2018/NĐ-CP và Thông tư 33/2023/TT-BTC, tiêu chí CTH đòi hỏi tất cả nguyên liệu không có xuất xứ phải trải qua quá trình chuyển đổi mã HS ở cấp 4 số (Heading).",
        "citation_code": "Thông tư 33/2023/TT-BTC",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Theo quy tắc xuất xứ hàng hóa, công thức tính Hàm lượng giá trị khu vực (RVC) theo phương pháp gián tiếp là gì?",
        "options": {
            "A": "RVC = [(Trị giá FOB - Trị giá nguyên liệu không có xuất xứ VNM) / Trị giá FOB] x 100%",
            "B": "RVC = [(Trị giá CIF + Chi phí nhân công) / Trị giá FOB] x 100%",
            "C": "RVC = [Trị giá nguyên liệu nội địa / Trị giá xuất xưởng EXW] x 100%",
            "D": "RVC = [(Trị giá FOB - Thuế nhập khẩu) / Trị giá CIF] x 100%"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 8 Nghị định 31/2018/NĐ-CP, công thức tính RVC gián tiếp chuẩn quốc tế là: RVC = [(FOB - VNM) / FOB] * 100%, trong đó VNM là trị giá nguyên liệu không có xuất xứ.",
        "citation_code": "Điều 8 Nghị định 31/2018/NĐ-CP",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Quy tắc tỷ lệ không đáng kể (De Minimis) trong xác định xuất xứ hàng hóa thông thường cho phép điều gì?",
        "options": {
            "A": "Cho phép một tỷ lệ tối đa (thường là 10% giá FOB hoặc trọng lượng) nguyên liệu không đáp ứng tiêu chí chuyển đổi mã số hàng hóa (CTC) vẫn được coi là có xuất xứ",
            "B": "Miễn kiểm tra hồ sơ hải quan cho mọi lô hàng có thuế suất nhập khẩu dưới 5%",
            "C": "Cho phép doanh nghiệp không cần nộp C/O mà vẫn được hưởng thuế suất ưu đãi đặc biệt",
            "D": "Doanh nghiệp được phép khai sai xuất xứ nếu trị giá lô hàng dưới 1.000 USD"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 11 Nghị định 31/2018/NĐ-CP, quy tắc De Minimis cho phép hàng hóa không đáp ứng tiêu chí CTC vẫn được coi là có xuất xứ nếu trị giá nguyên liệu không đáp ứng CTC không vượt quá 10% trị giá FOB của hàng hóa.",
        "citation_code": "Điều 11 Nghị định 31/2018/NĐ-CP",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Trường hợp hóa đơn thương mại được phát hành bởi bên thứ ba (Third-party invoicing) trên C/O Form E thì thông tin bên thứ ba phải thể hiện ở ô nào?",
        "options": {
            "A": "Tích vào ô 'Third Party Invoicing' tại Ô số 13 và ghi tên, quốc gia của công ty phát hành hóa đơn tại Ô số 7",
            "B": "Bắt buộc phải ghi tên bên thứ ba tại Ô số 1 (Người xuất khẩu)",
            "C": "Không được phép sử dụng hóa đơn bên thứ ba trong mẫu C/O Form E",
            "D": "Chỉ cần ghi chú ở Ô số 12 (Xác nhận của người xuất khẩu)"
        },
        "correct_option": "A",
        "explanation": "Theo Thông tư 12/2019/TT-BCT quy định về quy tắc xuất xứ ACFTA (Form E), khi có hóa đơn bên thứ ba, Ô số 13 phải được tích vào mục 'Third Party Invoicing' và thông tin tên, nước của công ty phát hành hóa đơn phải được thể hiện tại Ô số 7.",
        "citation_code": "Thông tư 12/2019/TT-BCT (Form E)",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Khi Giấy chứng nhận xuất xứ hàng hóa (C/O) được cấp sau ngày giao hàng (ngày tàu chạy), trên C/O thường phải đóng dấu cụm từ gì?",
        "options": {
            "A": "ISSUED RETROACTIVELY",
            "B": "CERTIFIED TRUE COPY",
            "C": "DE MINIMIS APPROVED",
            "D": "DIRECT CONSIGNMENT"
        },
        "correct_option": "A",
        "explanation": "Theo quy định tại các FTA (như ACFTA, ATIGA, AJCEP...), trường hợp C/O không được cấp vào thời điểm xuất khẩu do lỗi vô ý hoặc lý do chính đáng, C/O cấp sau phải được đóng dấu 'ISSUED RETROACTIVELY' (Cấp sau).",
        "citation_code": "Nghị định 31/2018/NĐ-CP & Thông tư 33/2023/TT-BTC",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Thời hạn hiệu lực thông thường của Giấy chứng nhận xuất xứ hàng hóa (C/O) để nộp cho cơ quan Hải quan là bao lâu?",
        "options": {
            "A": "12 tháng kể từ ngày cấp C/O tại nước xuất khẩu",
            "B": "30 ngày kể từ ngày hàng cập cảng Việt Nam",
            "C": "06 tháng kể từ ngày ký hợp đồng ngoại thương",
            "D": "Vô thời hạn nếu hàng hóa không thay đổi tính chất"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Thông tư 33/2023/TT-BTC và quy định của hầu hết các FTA, C/O có hiệu lực trong vòng 12 tháng kể từ ngày cơ quan có thẩm quyền nước xuất khẩu cấp.",
        "citation_code": "Điều 15 Thông tư 33/2023/TT-BTC",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Quy định về 'Vận chuyển trực tiếp' (Direct Consignment) đối với hàng hóa có C/O ưu đãi yêu cầu điều kiện gì khi hàng chuyển tải qua nước thứ ba?",
        "options": {
            "A": "Hàng hóa phải nằm dưới sự giám sát của Hải quan nước quá cảnh và không trải qua bất kỳ công đoạn gia công, chế biến nào ngoài dỡ hàng, bốc lại hoặc bảo quản",
            "B": "Hàng hóa phải được mở niêm phong và đóng gói lại toàn bộ tại nước quá cảnh",
            "C": "Doanh nghiệp bắt buộc phải nộp thêm một bộ C/O mới do nước quá cảnh phát hành",
            "D": "Không được phép chuyển tải qua bất kỳ quốc gia nào ngoài nước xuất khẩu và Việt Nam"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 21 Nghị định 31/2018/NĐ-CP, hàng hóa vận chuyển qua nước không phải thành viên vẫn được coi là vận chuyển trực tiếp nếu giữ nguyên trạng, nằm dưới sự giám sát của Hải quan nước trung gian và chỉ thực hiện các thao tác bốc dỡ, bảo quản.",
        "citation_code": "Điều 21 Nghị định 31/2018/NĐ-CP",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Theo Hiệp định Đối tác Toàn diện và Tiến bộ xuyên Thái Bình Dương (CPTPP), chứng từ chứng nhận xuất xứ có điểm đặc thù nào so với các FTA truyền thống?",
        "options": {
            "A": "Cho phép cơ chế tự chứng nhận xuất xứ bởi người xuất khẩu, người sản xuất hoặc người nhập khẩu",
            "B": "Bắt buộc phải xin cấp C/O bản giấy duy nhất tại Bộ Công Thương",
            "C": "Không áp dụng tiêu chí hàm lượng giá trị khu vực RVC",
            "D": "Chỉ áp dụng đối với hàng hóa có kim ngạch dưới 5.000 USD"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Thông tư 03/2019/TT-BCT và Điều ước quốc tế CPTPP, CPTPP cho phép áp dụng cơ chế tự chứng nhận xuất xứ (self-certification of origin) linh hoạt bên cạnh C/O truyền thống.",
        "citation_code": "Thông tư 03/2019/TT-BCT (CPTPP)",
        "category": "Xuất xứ Hàng hóa"
    },
    {
        "question": "Quy tắc cộng gộp (Cumulation) trong các Hiệp định thương mại tự do cho phép nhà sản xuất thực hiện điều gì?",
        "options": {
            "A": "Coi nguyên liệu có xuất xứ từ một nước thành viên khác trong cùng khối hiệp định như là nguyên liệu có xuất xứ của nước mình khi tính toán xuất xứ thành phẩm",
            "B": "Cộng gộp trị giá hàng hóa của nhiều tờ khai khác nhau để được miễn thuế nhập khẩu",
            "C": "Được phép gộp thuế VAT và thuế Nhập khẩu vào chung một lần nộp",
            "D": "Cộng gộp thời gian lưu kho ngoại quan của các lô hàng khác nhau"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 7 Nghị định 31/2018/NĐ-CP, quy tắc cộng gộp cho phép coi nguyên liệu có xuất xứ từ một nước thành viên là nguyên liệu có xuất xứ tại nước thành viên tiến hành sản xuất sản phẩm tiếp theo.",
        "citation_code": "Điều 7 Nghị định 31/2018/NĐ-CP",
        "category": "Xuất xứ Hàng hóa"
    },

    # =========================================================================
    # CHUYÊN ĐỀ 2: TRỊ GIÁ HẢI QUAN & ĐIỀU CHỈNH INCOTERMS
    # =========================================================================
    {
        "question": "Theo Thông tư 39/2015/TT-BTC, khoản chi phí nào sau đây PHẢI CỘNG vào trị giá tính thuế nhập khẩu nếu chưa có trong giá mua?",
        "options": {
            "A": "Chi phí hoa hồng bán hàng và phí môi giới bán hàng",
            "B": "Chi phí hoa hồng mua hàng trả cho đại lý của bên mua",
            "C": "Chi phí dỡ hàng và xếp dỡ phát sinh sau khi hàng đã đến cảng dỡ Việt Nam",
            "D": "Các khoản thuế nội địa đã nộp tại Việt Nam (như thuế GTGT)"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 2 Điều 13 Thông tư 39/2015/TT-BTC, hoa hồng bán hàng và phí môi giới là khoản điều chỉnh cộng bắt buộc. Hoa hồng mua hàng không phải cộng.",
        "citation_code": "Điều 13 Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Khoản chi phí nào sau đây ĐƯỢC PHÉP TRỪ khỏi trị giá tính thuế nếu tách riêng trên chứng từ hóa đơn theo Thông tư 39/2015/TT-BTC?",
        "options": {
            "A": "Chi phí xây dựng, lắp đặt, bảo dưỡng hoặc hỗ trợ kỹ thuật thực hiện sau khi nhập khẩu",
            "B": "Cước vận chuyển quốc tế từ cảng xuất về cảng nhập Việt Nam",
            "C": "Phí bảo hiểm hàng hải quốc tế cho lô hàng",
            "D": "Phí bản quyền mà người mua phải trả như một điều kiện của hợp đồng mua bán"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 15 Thông tư 39/2015/TT-BTC, chi phí lắp đặt, vận hành, bảo dưỡng thực hiện sau nhập khẩu được trừ nếu tách riêng trên hóa đơn.",
        "citation_code": "Điều 15 Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Theo Incoterms 2020, điều kiện giao hàng FOB (Free on Board) quy định trách nhiệm thuê tàu và mua bảo hiểm chặng quốc tế thuộc về ai?",
        "options": {
            "A": "Người mua chịu trách nhiệm thuê phương tiện vận chuyển và mua bảo hiểm (nếu có)",
            "B": "Người bán bắt buộc phải thuê tàu và mua bảo hiểm loại A cho người mua",
            "C": "Cơ quan hải quan chỉ định đơn vị vận tải vận chuyển hàng hóa",
            "D": "Người bán chịu mọi chi phí và rủi ro cho đến khi hàng giao tại kho người mua"
        },
        "correct_option": "A",
        "explanation": "Trong điều kiện FOB Incoterms 2020, người bán giao hàng lên tàu tại cảng bốc; người mua chịu cước vận chuyển quốc tế (F) và bảo hiểm (I).",
        "citation_code": "Incoterms 2020 - ICC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Theo Incoterms 2020, điều kiện nào sau đây người bán có nghĩa vụ tối đa, bao gồm việc làm thủ tục nhập khẩu và nộp các loại thuế nhập khẩu?",
        "options": {
            "A": "DDP (Delivered Duty Paid)",
            "B": "EXW (Ex Works)",
            "C": "FOB (Free on Board)",
            "D": "CIF (Cost, Insurance and Freight)"
        },
        "correct_option": "A",
        "explanation": "DDP (Giao đã nộp thuế) là điều kiện quy định trách nhiệm tối đa cho người bán, bao gồm thông quan nhập khẩu và nộp toàn bộ các khoản thuế, lệ phí nhập khẩu.",
        "citation_code": "Incoterms 2020 - ICC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Khoản trợ giúp nào dưới đây do người mua cung cấp miễn phí cho người bán PHẢI cộng vào trị giá tính thuế nhập khẩu?",
        "options": {
            "A": "Khuôn dập, khuôn đúc, mẫu định hình được sử dụng để sản xuất hàng hóa nhập khẩu",
            "B": "Bản vẽ thiết kế kỹ thuật được thực hiện hoàn toàn tại Việt Nam",
            "C": "Chi phí kiểm toán tài chính nội bộ của bên mua tại Việt Nam",
            "D": "Tiền hoa hồng mua hàng trả cho văn phòng đại diện bên mua"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điểm đ Khoản 2 Điều 13 Thông tư 39/2015/TT-BTC, khuôn dập, khuôn đúc, công cụ do người mua cung cấp miễn phí để sản xuất hàng nhập khẩu là khoản điều chỉnh cộng (khoản trợ giúp). Bản vẽ kỹ thuật làm tại VN thì không cộng.",
        "citation_code": "Điều 13 Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Khi không xác định được trị giá hải quan theo phương pháp Trị giá giao dịch của hàng hóa nhập khẩu, phương pháp tiếp theo bắt buộc phải áp dụng theo tuần tự là gì?",
        "options": {
            "A": "Phương pháp trị giá giao dịch của hàng hóa nhập khẩu giống hệt",
            "B": "Phương pháp trị giá khấu trừ",
            "C": "Phương pháp trị giá tính toán",
            "D": "Phương pháp suy luận"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 5 Thông tư 39/2015/TT-BTC, 6 phương pháp xác định trị giá hải quan phải áp dụng tuần tự: 1. Trị giá giao dịch; 2. Hàng giống hệt; 3. Hàng tương tự; 4. Khấu trừ; 5. Tính toán; 6. Suy luận (phương pháp 4 và 5 có thể hoán đổi nếu người khai yêu cầu).",
        "citation_code": "Điều 5 Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Thời hạn cơ quan Hải quan tiến hành tham vấn giá khi nghi ngờ trị giá khai báo của người khai hải quan theo Thông tư 39/2015/TT-BTC là bao lâu?",
        "options": {
            "A": "Tối đa 30 ngày kể từ ngày đăng ký tờ khai hải quan",
            "B": "Trong vòng 24 giờ kể từ khi truyền tờ khai",
            "C": "Kéo dài 05 năm sau khi đã thông quan hàng hóa",
            "D": "Không quy định thời hạn tham vấn giá"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 25 Thông tư 38/2015/TT-BTC và Thông tư 39/2015/TT-BTC, thời hạn tham vấn một lần tối đa không quá 30 ngày kể từ ngày đăng ký tờ khai hải quan.",
        "citation_code": "Thông tư 39/2015/TT-BTC",
        "category": "Trị giá Hải quan"
    },
    {
        "question": "Công thức xác định trị giá CIF của lô hàng nhập khẩu từ giá FOB trong Incoterms là gì?",
        "options": {
            "A": "CIF = FOB + Cước vận chuyển quốc tế (F) + Phí bảo hiểm quốc tế (I)",
            "B": "CIF = FOB - Cước vận chuyển quốc tế (F) + Thuế xuất khẩu",
            "C": "CIF = FOB + Phí dỡ hàng tại cảng đến + Thuế GTGT",
            "D": "CIF = FOB + Chi phí bảo hành sản phẩm sau thông quan"
        },
        "correct_option": "A",
        "explanation": "Theo quy tắc Incoterms và nguyên tắc xác định trị giá tính thuế nhập khẩu tại cửa khẩu nhập đầu tiên, CIF = FOB + Freight (F) + Insurance (I).",
        "citation_code": "Thông tư 39/2015/TT-BTC & Incoterms 2020",
        "category": "Trị giá Hải quan"
    },

    # =========================================================================
    # CHUYÊN ĐỀ 3: THỦ TỤC HẢI QUAN & PHÂN LUỒNG ĐIỆN TỬ VNACCS
    # =========================================================================
    {
        "question": "Theo Luật Hải quan 2014, đối tượng nào sau đây chịu sự kiểm tra, giám sát hải quan?",
        "options": {
            "A": "Hàng hóa xuất khẩu, nhập khẩu, quá cảnh; phương tiện vận tải xuất cảnh, nhập cảnh, quá cảnh",
            "B": "Hàng hóa tiêu dùng nội địa lưu thông giữa các tỉnh không qua biên giới",
            "C": "Phương tiện vận tải công cộng hoạt động trong phạm vi nội đô",
            "D": "Hàng hóa nông sản lưu thông giữa các chợ truyền thống trong nước"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 3 Luật Hải quan 2014, đối tượng kiểm tra, giám sát hải quan gồm hàng hóa xuất khẩu, nhập khẩu, quá cảnh và phương tiện vận tải xuất cảnh, nhập cảnh, quá cảnh.",
        "citation_code": "Điều 3 Luật Hải quan 2014",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Thời hạn người khai hải quan phải nộp tờ khai hải quan đối với hàng hóa nhập khẩu là bao lâu?",
        "options": {
            "A": "Nộp trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến cửa khẩu",
            "B": "Bắt buộc phải nộp sau khi hàng hóa đã vào kho nội địa 15 ngày",
            "C": "Chỉ được nộp tờ khai sau khi đã hoàn thành nộp thuế 60 ngày",
            "D": "Không quy định thời hạn nộp tờ khai hải quan"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 25 Luật Hải quan 2014, đối với hàng hóa nhập khẩu, tờ khai hải quan được nộp trước ngày hàng hóa đến cửa khẩu hoặc trong thời hạn 30 ngày kể từ ngày hàng hóa đến cửa khẩu.",
        "citation_code": "Điều 25 Luật Hải quan 2014",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Trong hệ thống thông quan tự động VNACCS/VCIS, kết quả phân luồng tờ khai màu VÀNG có ý nghĩa gì?",
        "options": {
            "A": "Cơ quan Hải quan kiểm tra chi tiết hồ sơ hải quan, miễn kiểm tra thực tế hàng hóa",
            "B": "Miễn kiểm tra chi tiết hồ sơ và miễn kiểm tra thực tế hàng hóa (thông quan ngay)",
            "C": "Bắt buộc phải kiểm tra thực tế 100% hàng hóa tại bãi kiểm hóa",
            "D": "Tờ khai bị hủy bỏ tự động do lỗi hệ thống"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 29 Thông tư 38/2015/TT-BTC, Luồng Vàng yêu cầu cán bộ hải quan kiểm tra chi tiết hồ sơ điện tử/giấy tờ đính kèm; nếu hồ sơ hợp lệ sẽ được chấp nhận thông quan.",
        "citation_code": "Thông tư 38/2015/TT-BTC",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Kết quả phân luồng ĐỎ trong thủ tục hải quan điện tử quy định nội dung kiểm tra nào?",
        "options": {
            "A": "Cơ quan Hải quan kiểm tra chi tiết hồ sơ hải quan và kiểm tra thực tế hàng hóa (bằng máy soi hoặc kiểm thủ công)",
            "B": "Miễn kiểm tra toàn bộ hồ sơ và cho phép đưa hàng về kho ngay",
            "C": "Chỉ kiểm tra chữ ký số của doanh nghiệp trên phần mềm",
            "D": "Doanh nghiệp tự niêm phong và tự chịu trách nhiệm mà không cần hải quan kiểm tra"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Thông tư 38/2015/TT-BTC, Luồng Đỏ yêu cầu kiểm tra chi tiết hồ sơ và kiểm tra thực tế hàng hóa theo các mức độ (kiểm tra bằng máy soi hoặc kiểm tra thủ công 5%, 10% hoặc toàn bộ).",
        "citation_code": "Điều 29 Thông tư 38/2015/TT-BTC",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Thời hạn người khai hải quan phải lưu trữ hồ sơ hải quan, sổ sách chứng từ kế toán liên quan đến hàng hóa xuất nhập khẩu là bao lâu?",
        "options": {
            "A": "05 năm kể từ ngày đăng ký tờ khai hải quan",
            "B": "01 năm kể từ ngày thông quan",
            "C": "06 tháng kể từ khi kết thúc năm tài chính",
            "D": "Vô thời hạn đối với tất cả loại hình doanh nghiệp"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điểm đ Khoản 2 Điều 18 Luật Hải quan 2014, người khai hải quan có nghĩa vụ lưu giữ hồ sơ hải quan đối với hàng hóa đã được thông quan trong thời hạn 05 năm kể từ ngày đăng ký tờ khai.",
        "citation_code": "Điều 18 Luật Hải quan 2014",
        "category": "Thủ tục Hải quan"
    },
    {
        "question": "Tờ khai hải quan nhập khẩu chưa thông quan sẽ bị hệ thống tự động HỦY trong trường hợp nào?",
        "options": {
            "A": "Quá thời hạn 15 ngày kể từ ngày đăng ký tờ khai mà người khai không xuất trình hồ sơ hoặc không xuất trình hàng hóa để kiểm tra",
            "B": "Quá 24 giờ kể từ khi đăng ký tờ khai điện tử",
            "C": "Khi doanh nghiệp đổi tên giám đốc điều hành",
            "D": "Khi tỷ giá ngoại tệ biến động trên 2%"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 1 Điều 22 Thông tư 38/2015/TT-BTC (sửa đổi Thông tư 39/2018/TT-BTC), tờ khai hải quan đã đăng ký nhưng chưa thông quan sẽ bị hủy nếu quá thời hạn 15 ngày kể từ ngày đăng ký mà người khai không xuất trình hồ sơ/hàng hóa.",
        "citation_code": "Điều 22 Thông tư 38/2015/TT-BTC",
        "category": "Thủ tục Hải quan"
    },

    # =========================================================================
    # CHUYÊN ĐỀ 4: KIỂM TRA SAU THÔNG QUAN & XỬ PHẠT VI PHẠM
    # =========================================================================
    {
        "question": "Thời hạn cơ quan Hải quan được quyền thực hiện Kiểm tra sau thông quan đối với hàng hóa xuất nhập khẩu tối đa là bao lâu?",
        "options": {
            "A": "05 năm kể từ ngày đăng ký tờ khai hải quan",
            "B": "01 năm kể từ ngày thông quan hàng hóa",
            "C": "02 năm kể từ ngày ban hành quyết định xử phạt",
            "D": "10 năm đối với mọi loại hình doanh nghiệp"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 1 Điều 77 Luật Hải quan 2014, kiểm tra sau thông quan được thực hiện trong thời hạn 05 năm kể từ ngày đăng ký tờ khai hải quan.",
        "citation_code": "Điều 77 Luật Hải quan 2014",
        "category": "Kiểm tra Sau thông quan"
    },
    {
        "question": "Mức tính tiền chậm nộp thuế đối với số tiền thuế xuất khẩu, thuế nhập khẩu chậm nộp hiện nay là bao nhiêu?",
        "options": {
            "A": "0,03%/ngày tính trên số tiền thuế chậm nộp",
            "B": "0,05%/ngày tính trên tổng trị giá lô hàng",
            "C": "0,1%/ngày tính trên số tiền phạt hành chính",
            "D": "1,0%/tháng cố định không phụ thuộc số ngày"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 2 Điều 59 Luật Quản lý thuế số 38/2019/QH14, mức tính tiền chậm nộp bằng 0,03%/ngày tính trên số tiền thuế chậm nộp.",
        "citation_code": "Điều 59 Luật Quản lý thuế 2019",
        "category": "Kiểm tra Sau thông quan"
    },
    {
        "question": "Thời hạn kiểm tra sau thông quan tại trụ sở người nộp thuế được quy định tối đa là bao nhiêu ngày?",
        "options": {
            "A": "Không quá 10 ngày làm việc (trường hợp phức tạp có thể gia hạn một lần không quá 10 ngày làm việc)",
            "B": "Không quá 30 ngày làm việc liên tục",
            "C": "Không quá 03 ngày làm việc kể từ ngày công bố quyết định",
            "D": "Tùy ý cơ quan hải quan quyết định không giới hạn thời gian"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 3 Điều 80 Luật Hải quan 2014, thời hạn kiểm tra sau thông quan tại trụ sở người khai hải quan không quá 10 ngày làm việc. Gia hạn không quá 10 ngày làm việc đối với trường hợp phức tạp.",
        "citation_code": "Điều 80 Luật Hải quan 2014",
        "category": "Kiểm tra Sau thông quan"
    },
    {
        "question": "Theo Nghị định xử phạt vi phạm hành chính trong lĩnh vực hải quan, hành vi khai sai dẫn đến thiếu số tiền thuế phải nộp thì bị xử phạt như thế nào?",
        "options": {
            "A": "Phạt 20% tính trên số tiền thuế khai thiếu hoặc số tiền thuế được miễn, giảm, hoàn, không thu cao hơn quy định",
            "B": "Phạt 100% số tiền thuế khai thiếu trong mọi trường hợp",
            "C": "Tịch thu toàn bộ lô hàng hóa xuất nhập khẩu",
            "D": "Buộc đóng cửa doanh nghiệp ngay lập tức"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Nghị định 128/2020/NĐ-CP (và Nghị định 102/2021/NĐ-CP), hành vi vi phạm quy định về khai thuế dẫn đến thiếu số tiền thuế phải nộp bị phạt 20% số tiền thuế khai thiếu.",
        "citation_code": "Điều 9 Nghị định 128/2020/NĐ-CP",
        "category": "Kiểm tra Sau thông quan"
    },
    {
        "question": "Ai có thẩm quyền ban hành Quyết định kiểm tra sau thông quan tại trụ sở người khai hải quan theo Luật Hải quan?",
        "options": {
            "A": "Tổng cục trưởng Tổng cục Hải quan, Cục trưởng Cục Kiểm tra sau thông quan, Cục trưởng Cục Hải quan tỉnh, liên tỉnh, thành phố",
            "B": "Đội trưởng Đội kiểm soát hải quan tại cửa khẩu",
            "C": "Công chức hải quan được phân công thụ lý hồ sơ kiểm hóa",
            "D": "Ủy ban nhân dân cấp quận, huyện nơi doanh nghiệp đóng trụ sở"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 1 Điều 80 Luật Hải quan 2014, người có thẩm quyền ban hành quyết định kiểm tra tại trụ sở người khai gồm: Tổng cục trưởng Tổng cục Hải quan, Cục trưởng Cục Kiểm tra sau thông quan, Cục trưởng Cục Hải quan.",
        "citation_code": "Điều 80 Luật Hải quan 2014",
        "category": "Kiểm tra Sau thông quan"
    },

    # =========================================================================
    # CHUYÊN ĐỀ 5: PHÂN LOẠI HÀNG HÓA & 6 QUY TẮC MÃ SỐ HS
    # =========================================================================
    {
        "question": "Quy tắc 1 trong 6 Quy tắc tổng quát giải thích việc phân loại hàng hóa theo Danh mục HS (GIR 1) khẳng định điều gì có giá trị pháp lý quyết định?",
        "options": {
            "A": "Tên các Phần, Chương và Phân chương chỉ để thuận tiện cho việc tra cứu; việc phân loại phải căn cứ vào nội dung của nhóm hàng và Chú giải của các Phần, Chương liên quan",
            "B": "Mọi hàng hóa đều phải được phân loại theo hình ảnh thực tế trên bao bì",
            "C": "Quy tắc phân loại căn cứ duy nhất vào công dụng của sản phẩm mà không cần đọc Chú giải",
            "D": "Tên các Chương có giá trị pháp lý cao hơn nội dung chi tiết của nhóm hàng"
        },
        "correct_option": "A",
        "explanation": "Theo GIR 1 trong Thông tư 14/2015/TT-BTC (sửa đổi Thông tư 17/2021/TT-BTC), tên các phần, chương chỉ nhằm mục đích tra cứu; phân loại pháp lý phải căn cứ vào câu chữ của nhóm hàng và chú giải phần, chương.",
        "citation_code": "Quy tắc 1 - Thông tư 14/2015/TT-BTC",
        "category": "Mã số HS"
    },
    {
        "question": "Quy tắc 2a (GIR 2a) hướng dẫn phân loại đối với mặt hàng nào sau đây?",
        "options": {
            "A": "Một mặt hàng ở dạng chưa hoàn chỉnh hoặc chưa hoàn thiện nhưng có đặc trưng cơ bản của hàng hóa đã hoàn chỉnh, hoặc hàng hóa ở dạng chưa lắp ráp, tháo rời",
            "B": "Hỗn hợp của nhiều chất lỏng khác nhau",
            "C": "Hàng hóa đóng gói thành bộ để bán lẻ",
            "D": "Các loại bao bì đựng hàng hóa thông thường"
        },
        "correct_option": "A",
        "explanation": "Căn cứ GIR 2a, một mặt hàng chưa hoàn chỉnh, chưa hoàn thiện nhưng đã có đặc trưng cơ bản của hàng thành phẩm, hoặc hàng ở dạng tháo rời, chưa lắp ráp, được phân loại cùng nhóm với hàng hoàn chỉnh.",
        "citation_code": "Quy tắc 2a - Thông tư 14/2015/TT-BTC",
        "category": "Mã số HS"
    },
    {
        "question": "Khi một mặt hàng thoạt nhìn có thể phân loại vào từ hai hay nhiều nhóm, Quy tắc 3a (GIR 3a) quy định nguyên tắc ưu tiên nào?",
        "options": {
            "A": "Nhóm hàng có mô tả cụ thể nhất sẽ được ưu tiên hơn các nhóm hàng có mô tả khái quát",
            "B": "Nhóm hàng có mức thuế suất nhập khẩu cao hơn sẽ được ưu tiên",
            "C": "Nhóm hàng có mã số đứng đầu tiên trong biểu thuế sẽ được chọn",
            "D": "Doanh nghiệp tự do lựa chọn nhóm hàng có lợi nhất cho mình"
        },
        "correct_option": "A",
        "explanation": "Căn cứ GIR 3a, nhóm có mô tả cụ thể nhất được ưu tiên hơn các nhóm có mô tả mang tính khái quát khi hàng hóa có thể xếp vào nhiều nhóm khác nhau.",
        "citation_code": "Quy tắc 3a - Thông tư 14/2015/TT-BTC",
        "category": "Mã số HS"
    },
    {
        "question": "Quy tắc 3b (GIR 3b) áp dụng để phân loại hàng hóa nào?",
        "options": {
            "A": "Hàng hóa tạo thành từ nhiều bộ phận hợp thành, hỗn hợp hoặc hàng hóa đóng thành bộ để bán lẻ mà không phân loại được theo Quy tắc 3a (căn cứ vào yếu tố tạo nên đặc trưng cơ bản)",
            "B": "Hàng hóa nhập khẩu dạng rời từng con ốc vít",
            "C": "Hàng hóa là hóa chất tinh khiết 100%",
            "D": "Hàng hóa nông sản tươi sống"
        },
        "correct_option": "A",
        "explanation": "Căn cứ GIR 3b, các hỗn hợp, sản phẩm cấu thành từ nhiều nguyên liệu khác nhau hoặc hàng đóng bộ để bán lẻ được phân loại theo nguyên liệu hoặc bộ phận tạo nên đặc trưng cơ bản của hàng hóa.",
        "citation_code": "Quy tắc 3b - Thông tư 14/2015/TT-BTC",
        "category": "Mã số HS"
    },
    {
        "question": "Mã số hàng hóa (Mã HS) trong Biểu thuế xuất khẩu, Biểu thuế nhập khẩu Việt Nam hiện nay được quy chuẩn gồm bao nhiêu chữ số?",
        "options": {
            "A": "08 chữ số (chuẩn theo Danh mục Biểu thuế Hài hòa ASEAN - AHTN)",
            "B": "06 chữ số (chuẩn quốc tế WCO)",
            "C": "10 chữ số",
            "D": "04 chữ số"
        },
        "correct_option": "A",
        "explanation": "Theo Thông tư 31/2022/TT-BTC về Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam, mã số HS tại Việt Nam gồm 8 chữ số, tuân thủ Danh mục Biểu thuế Hài hòa ASEAN (AHTN).",
        "citation_code": "Thông tư 31/2022/TT-BTC",
        "category": "Mã số HS"
    },

    # =========================================================================
    # CHUYÊN ĐỀ 6: THUẾ XUẤT NHẬP KHẨU & TRỊ GIÁ TÍNH THUẾ
    # =========================================================================
    {
        "question": "Theo Luật Thuế xuất khẩu, thuế nhập khẩu 2016, thuế suất ưu đãi (MFN) được áp dụng đối với hàng hóa nhập khẩu nào?",
        "options": {
            "A": "Hàng hóa nhập khẩu có xuất xứ từ nước, nhóm nước hoặc vùng lãnh thổ thực hiện đối xử tối huệ quốc (MFN) trong quan hệ thương mại với Việt Nam",
            "B": "Hàng hóa nhập khẩu từ các nước có ký hiệp định thương mại tự do (FTA) với Việt Nam và có C/O hợp lệ",
            "C": "Hàng hóa nhập khẩu từ các nước chưa có bất kỳ thỏa thuận thương mại nào với Việt Nam",
            "D": "Áp dụng bắt buộc đối với tất cả hàng hóa viện trợ nhân đạo"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điểm a Khoản 3 Điều 5 Luật Thuế XNK số 107/2016/QH13, thuế suất ưu đãi (MFN) áp dụng cho hàng hóa có xuất xứ từ nước, khối nước áp dụng quy chế tối huệ quốc với Việt Nam.",
        "citation_code": "Điều 5 Luật Thuế XNK 2016",
        "category": "Thuế Xuất nhập khẩu"
    },
    {
        "question": "Hàng hóa nhập khẩu có xuất xứ từ nước không thực hiện đối xử tối huệ quốc (MFN) và không có thỏa thuận ưu đãi đặc biệt với Việt Nam thì áp dụng thuế suất nào?",
        "options": {
            "A": "Thuế suất thông thường (bằng 150% thuế suất ưu đãi của từng mặt hàng tương ứng)",
            "B": "Thuế suất 0%",
            "C": "Thuế suất ưu đãi đặc biệt FTA",
            "D": "Miễn thuế nhập khẩu hoàn toàn"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điểm c Khoản 3 Điều 5 Luật Thuế XNK 2016, thuế suất thông thường áp dụng cho hàng hóa không thuộc diện ưu đãi hoặc ưu đãi đặc biệt, được quy định bằng 150% thuế suất ưu đãi.",
        "citation_code": "Điều 5 Luật Thuế XNK 2016",
        "category": "Thuế Xuất nhập khẩu"
    },
    {
        "question": "Nguyên liệu, vật tư, linh kiện nhập khẩu để gia công cho thương nhân nước ngoài hoặc sản xuất hàng xuất khẩu (SXXK) theo Luật Thuế XNK 2016 thuộc đối tượng nào?",
        "options": {
            "A": "Được miễn thuế nhập khẩu",
            "B": "Phải nộp thuế nhập khẩu ngay và không được hoàn thuế khi xuất khẩu",
            "C": "Chịu mức thuế suất cố định 20%",
            "D": "Không thuộc đối tượng điều chỉnh của Luật Hải quan"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 6 và Khoản 7 Điều 16 Luật Thuế XNK số 107/2016/QH13, nguyên liệu, vật tư nhập khẩu để gia công cho nước ngoài hoặc để sản xuất hàng hóa xuất khẩu được miễn thuế nhập khẩu.",
        "citation_code": "Điều 16 Luật Thuế XNK 2016",
        "category": "Thuế Xuất nhập khẩu"
    },
    {
        "question": "Thời điểm tính thuế xuất khẩu, thuế nhập khẩu đối với hàng hóa là thời điểm nào?",
        "options": {
            "A": "Thời điểm đăng ký tờ khai hải quan",
            "B": "Thời điểm hàng hóa rời cảng đi tại nước xuất khẩu",
            "C": "Thời điểm ký kết hợp đồng mua bán ngoại thương",
            "D": "Thời điểm doanh nghiệp nhận được thông báo nợ từ ngân hàng"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 8 Luật Thuế XNK 2016, thời điểm tính thuế xuất khẩu, thuế nhập khẩu là thời điểm đăng ký tờ khai hải quan.",
        "citation_code": "Điều 8 Luật Thuế XNK 2016",
        "category": "Thuế Xuất nhập khẩu"
    },

    # =========================================================================
    # CHUYÊN ĐỀ 7: LOẠI HÌNH ĐẶC THÙ (GIA CÔNG, SXXK, KHO NGOẠI QUAN)
    # =========================================================================
    {
        "question": "Thời hạn lưu giữ hàng hóa trong kho ngoại quan tại Việt Nam theo Luật Hải quan 2014 tối đa là bao lâu?",
        "options": {
            "A": "Không quá 12 tháng kể từ ngày hàng đưa vào kho (được gia hạn một lần không quá 12 tháng)",
            "B": "Không quá 06 tháng và không được phép gia hạn",
            "C": "Không quá 30 ngày kể từ ngày cập cảng",
            "D": "Vô thời hạn nếu doanh nghiệp tiếp tục trả phí lưu kho"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Khoản 1 Điều 61 Luật Hải quan 2014, hàng hóa gửi kho ngoại quan được lưu giữ không quá 12 tháng; có lý do chính đáng được Cục trưởng Cục Hải quan gia hạn một lần không quá 12 tháng.",
        "citation_code": "Điều 61 Luật Hải quan 2014",
        "category": "Loại hình Đặc thù"
    },
    {
        "question": "Thời hạn nộp Báo cáo quyết toán tình hình sử dụng nguyên liệu, vật tư nhập khẩu gia công, SXXK theo Thông tư 39/2018/TT-BTC là khi nào?",
        "options": {
            "A": "Chậm nhất là ngày thứ 90 kể từ ngày kết thúc năm tài chính",
            "B": "Ngay tại thời điểm thông quan từng tờ khai nhập khẩu nguyên liệu",
            "C": "Sau khi hết hợp đồng gia công 10 năm",
            "D": "Vào ngày đầu tiên của mỗi tháng dương lịch"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 60 Thông tư 38/2015/TT-BTC (sửa đổi Thông tư 39/2018/TT-BTC), tổ chức, cá nhân nộp báo cáo quyết toán chậm nhất ngày thứ 90 kể từ ngày kết thúc năm tài chính.",
        "citation_code": "Thông tư 39/2018/TT-BTC",
        "category": "Loại hình Đặc thù"
    },
    {
        "question": "Thời hạn lưu lại tại Việt Nam đối với hàng hóa kinh doanh tạm nhập tái xuất theo Nghị định 69/2018/NĐ-CP là bao lâu?",
        "options": {
            "A": "Không quá 60 ngày kể từ ngày hoàn thành thủ tục tạm nhập (gia hạn không quá 2 lần, mỗi lần tối đa 30 ngày)",
            "B": "Không quá 10 ngày kể từ ngày cập cảng",
            "C": "Tự động chuyển tiêu thụ nội địa sau 15 ngày",
            "D": "Không giới hạn thời gian tái xuất"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 13 Nghị định 69/2018/NĐ-CP, hàng kinh doanh tạm nhập tái xuất lưu tại Việt Nam không quá 60 ngày, gia hạn không quá 2 lần, mỗi lần tối đa 30 ngày.",
        "citation_code": "Điều 13 Nghị định 69/2018/NĐ-CP",
        "category": "Loại hình Đặc thù"
    },

    # =========================================================================
    # CHUYÊN ĐỀ 8: PHÒNG VỆ THƯƠNG MẠI (CHỐNG BÁN PHÁ GIÁ, TRỢ CẤP)
    # =========================================================================
    {
        "question": "Thuế chống bán phá giá (AD) được áp dụng trong trường hợp nào theo Luật Quản lý ngoại thương 2017?",
        "options": {
            "A": "Hàng hóa nhập khẩu được bán phá giá vào Việt Nam và gây ra hoặc đe dọa gây ra thiệt hại đáng kể cho ngành sản xuất trong nước",
            "B": "Tất cả hàng hóa có giá bán thấp hơn hàng hóa sản xuất tại Mỹ",
            "C": "Áp dụng bắt buộc đối với mọi loại hàng hóa có xuất xứ từ châu Âu",
            "D": "Khi doanh nghiệp trong nước tự ý yêu cầu mà không qua điều tra"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Điều 77 Luật Quản lý ngoại thương số 05/2017/QH14, thuế chống bán phá giá áp dụng khi hàng nhập khẩu bán phá giá gây thiệt hại đáng kể cho ngành sản xuất nội địa.",
        "citation_code": "Điều 77 Luật Quản lý ngoại thương 2017",
        "category": "Phòng vệ Thương mại"
    },
    {
        "question": "Thời hạn áp dụng thuế chống bán phá giá, thuế chống trợ cấp chính thức theo quy định tối đa là bao lâu?",
        "options": {
            "A": "Không quá 05 năm kể từ ngày quyết định áp dụng có hiệu lực (có thể được rà soát gia hạn)",
            "B": "Vô thời hạn cho đến khi doanh nghiệp xuất khẩu phá sản",
            "C": "Tối đa 120 ngày kể từ ngày ban hành quyết định",
            "D": "Chỉ áp dụng trong vòng 30 ngày rồi tự động hủy bỏ"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Luật Quản lý ngoại thương 2017, thời hạn áp dụng thuế phòng vệ chính thức không quá 5 năm, trừ trường hợp được gia hạn sau rà soát hoàng hôn.",
        "citation_code": "Điều 82 Luật Quản lý ngoại thương 2017",
        "category": "Phòng vệ Thương mại"
    },
    {
        "question": "Cơ sở tính thuế Giá trị gia tăng (VAT) đối với hàng hóa nhập khẩu chịu cả thuế Nhập khẩu và thuế Chống bán phá giá là gì?",
        "options": {
            "A": "Trị giá tính thuế nhập khẩu + Thuế nhập khẩu + Thuế chống bán phá giá",
            "B": "Chỉ tính trên Trị giá FOB của lô hàng",
            "C": "Chỉ tính trên số tiền Thuế chống bán phá giá",
            "D": "Trị giá tính thuế nhập khẩu trừ đi thuế nhập khẩu"
        },
        "correct_option": "A",
        "explanation": "Căn cứ Luật Thuế GTGT và Luật Thuế XNK, giá tính thuế GTGT của hàng nhập khẩu = Trị giá tính thuế NK + Thuế NK + Thuế phòng vệ thương mại (nếu có).",
        "citation_code": "Luật Thuế GTGT & Thông tư 38/2015/TT-BTC",
        "category": "Phòng vệ Thương mại"
    }
]
