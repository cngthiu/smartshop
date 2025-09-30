//client/components/UserFaceEnrollModal.jsx
import { useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import fetchUserDetails from "../utils/fetchUserDetails";
import { useDispatch } from "react-redux";
import { setUserDetails } from "../store/userSlice";

export default function UserFaceEnrollModal({ close }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [frames, setFrames] = useState([]); // blob[]
  const dispatch = useDispatch();

  // bật camera
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
      } catch (e) {
        toast.error("Không thể bật camera: " + (e?.message || ""));
      }
    })();
    return () => {
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      toast.error("Camera chưa sẵn sàng");
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    setFrames((prev) => [...prev, blob]);
  };

  const clearFrames = () => setFrames([]);

  const submitEnroll = async () => {
    if (frames.length === 0) {
      toast.error("Hãy chụp ít nhất 1 ảnh (khuyến nghị 3–5 ảnh)");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      frames.forEach((b, idx) =>
        form.append("frames", b, `frame_${idx + 1}.jpg`)
      );

      const resp = await Axios({
        ...SummaryApi.faceEnroll,
        data: form,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!resp?.data?.success)
        throw new Error(resp?.data?.message || "Enroll thất bại");
      toast.success("Đăng ký khuôn mặt thành công!");

      // cập nhật user store
      const ud = await fetchUserDetails();
      if (ud?.success) dispatch(setUserDetails(ud.data));

      close();
    } catch (e) {
      toast.error(e?.message || "Enroll thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fixed inset-0 bg-neutral-900/60 p-4 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Đăng ký khuôn mặt</h3>
          <button onClick={close} className="text-neutral-700">
            <IoClose size={20} />
          </button>
        </div>

        <div className="rounded overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full bg-black rounded"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={captureFrame}
            className="px-3 py-2 rounded bg-green-700 text-white hover:bg-green-600"
          >
            Chụp ảnh
          </button>
          <button onClick={clearFrames} className="px-3 py-2 rounded border">
            Xoá ảnh
          </button>
          <button
            onClick={submitEnroll}
            disabled={busy || frames.length === 0}
            className={`px-3 py-2 rounded text-white ${
              busy || frames.length === 0
                ? "bg-gray-400"
                : "bg-blue-700 hover:bg-blue-600"
            }`}
          >
            {busy ? "Đang lưu..." : `Lưu (${frames.length}) ảnh`}
          </button>
        </div>

        {frames.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            Mẹo: chụp 3–5 ảnh với góc hơi nghiêng, ánh sáng đủ để tăng độ chính
            xác.
          </p>
        )}
      </div>
    </section>
  );
}
