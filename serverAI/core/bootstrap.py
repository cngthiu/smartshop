from modules.face_auth.service import face_bootstrap
from modules.product_recognition.service import product_bootstrap

def bootstrap_all():
    # Khởi tạo theo thứ tự, log lỗi module nào không cản trở module khác
    try:
        face_bootstrap()
    except Exception as exc:
        print("[bootstrap] face_auth failed:", exc)

    try:
        product_bootstrap()
    except Exception as exc:
        print("[bootstrap] product_recognition failed:", exc)
