// client/src/components/FaceLogin.jsx
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import fetchUserDetails from "../utils/fetchUserDetails";
import { useDispatch } from "react-redux";
import { setUserDetails } from "../store/userSlice";
import { useNavigate } from "react-router-dom";

// Nhịp chụp & cooldown
const CAPTURE_INTERVAL_MS = 1600; // giãn nhịp để giảm tải
const TOAST_COOLDOWN_MS = 4000; // ít nhất 4s mới cập nhật toast 1 lần
const WARN_INLINE_COOLDOWN_MS = 1200; // inline text cập nhật tối đa ~1.2s/lần

export default function FaceLogin() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const inflightRef = useRef(false);
  const runningRef = useRef(true);

  const [camError, setCamError] = useState("");
  const [inlineMsg, setInlineMsg] = useState("Đang quét khuôn mặt…");
  const lastInlineTsRef = useRef(0);

  const toastIdRef = useRef(null);
  const lastToastMsgRef = useRef("");
  const lastToastTsRef = useRef(0);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ===== Helpers =====
  const updateInline = (msg) => {
    const now = Date.now();
    if (now - lastInlineTsRef.current > WARN_INLINE_COOLDOWN_MS) {
      setInlineMsg(msg);
      lastInlineTsRef.current = now;
    }
  };

  // 1 toast duy nhất, chỉ update khi đổi thông điệp hoặc qua cooldown
  const updateSingleToast = (msg) => {
    const now = Date.now();
    const changed = msg !== lastToastMsgRef.current;
    const cooled = now - lastToastTsRef.current > TOAST_COOLDOWN_MS;

    if (!changed && !cooled) return;

    if (!toastIdRef.current) {
      toastIdRef.current = toast(msg, { icon: "ℹ️" });
    } else {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = toast(msg, { icon: "ℹ️" });
    }
    lastToastMsgRef.current = msg;
    lastToastTsRef.current = now;
  };

  const clearToast = () => {
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
      lastToastMsgRef.current = "";
    }
  };

  const stopScanning = () => {
    runningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ===== Camera mount =====
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setCamError(err?.message || "Không thể truy cập camera");
        toast.error("Không thể bật camera. Kiểm tra quyền truy cập.");
      }
    })();

    return () => {
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      clearToast();
    };
  }, []);

  // ===== Auto scan =====
  useEffect(() => {
    if (camError) return;
    runningRef.current = true;

    const canScan = () =>
      document.visibilityState === "visible" &&
      runningRef.current &&
      !inflightRef.current;

    const tick = async () => {
      try {
        if (!canScan()) return;

        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        inflightRef.current = true;

        // chụp 1 frame
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.9)
        );

        const form = new FormData();
        form.append("frame", blob, "frame.jpg");

        const resp = await Axios({
          ...SummaryApi.faceLogin, // POST /api/user/auth/face/login (camera-only 1:N)
          data: form,
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
          // NOTE: không set timeout quá thấp; để Axios mặc định
        });

        const { data } = resp;

        if (data?.error) {
          // Không success nhưng vẫn là 200 -> xử lý thông điệp nhẹ nhàng
          updateInline(data?.message || "Đang nhận diện…");
          updateSingleToast(data?.message || "Đang nhận diện…");
          return;
        }

        if (data?.success) {
          // Thành công → dừng quét
          stopScanning();
          clearToast();

          localStorage.setItem("accesstoken", data?.data?.accesstoken || "");
          localStorage.setItem("refreshToken", data?.data?.refreshToken || "");

          const userDetails = await fetchUserDetails();
          if (userDetails?.success) {
            dispatch(setUserDetails(userDetails.data));
          }
          toast.success("Đăng nhập bằng khuôn mặt thành công!");
          navigate("/");
        }
      } catch (e) {
        // HTTP lỗi: chỉ hiển thị inline + update toast theo cooldown
        const msg =
          e?.response?.data?.message ||
          (e?.response?.status === 429
            ? "Hệ thống đang bận, vui lòng giữ nguyên khuôn mặt trong khung…"
            : "Đang nhận diện…");

        updateInline(msg);
        updateSingleToast(msg);
        // Nếu bị 429 rate-limit, cho “nghỉ” 1 nhịp tiếp theo
        if (e?.response?.status === 429) {
          // tắt 1 lần, lần tick sau sẽ chạy lại
        }
      } finally {
        inflightRef.current = false;
      }
    };

    // chạy ngay 1 lần rồi theo interval
    tick();
    timerRef.current = setInterval(tick, CAPTURE_INTERVAL_MS);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [camError, dispatch, navigate]);

  return (
    <div className="grid gap-3">
      <div className="w-full rounded overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full rounded bg-black"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="text-sm text-gray-600 min-h-5">
        {camError ? (
          <span className="text-red-600">Lỗi camera: {camError}</span>
        ) : (
          <span>{inlineMsg}</span>
        )}
      </div>
    </div>
  );
}
