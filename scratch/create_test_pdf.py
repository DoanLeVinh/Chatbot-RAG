from reportlab.pdfgen import canvas

c = canvas.Canvas("test_small.pdf")
c.drawString(100, 750, "Điều 1. Mục đích của luật này")
c.drawString(100, 730, "Luật này quy định các nguyên tắc chung về thử nghiệm hệ thống.")
c.showPage()
c.save()
print("Created test_small.pdf")
