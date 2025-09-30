// //client/src/pages/Login.jsx

import { useState } from "react";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa6";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import AxiosToastError from "../utils/AxiosToastError";
import { Link, useNavigate } from "react-router-dom";
import fetchUserDetails from "../utils/fetchUserDetails";
import { useDispatch } from "react-redux";
import { setUserDetails } from "../store/userSlice";
import FaceLogin from "../components/FaceLogin";

const Login = () => {
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("password"); // "password" | "camera"
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((preve) => ({ ...preve, [name]: value }));
  };

  const valideValue = Object.values(data).every((el) => el);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await Axios({
        ...SummaryApi.login,
        data: data,
      });

      if (response.data.error) {
        toast.error(response.data.message);
      }

      if (response.data.success) {
        toast.success(response.data.message);
        localStorage.setItem(
          "accesstoken",
          response.data.data.accesstoken || ""
        );
        localStorage.setItem(
          "refreshToken",
          response.data.data.refreshToken || ""
        );

        const userDetails = await fetchUserDetails();
        if (userDetails?.success) {
          dispatch(setUserDetails(userDetails.data));
        }

        setData({
          email: "",
          password: "",
        });
        navigate("/");
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  return (
    <section className="w-full container mx-auto px-2">
      <div className="bg-white my-4 w-full max-w-lg mx-auto rounded p-7">
        {/* TAB SWITCH */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("password")}
            className={`px-3 py-2 rounded font-semibold ${
              mode === "password"
                ? "bg-green-800 text-white"
                : "bg-blue-50 text-gray-700"
            }`}
          >
            Đăng nhập bằng mật khẩu
          </button>
          <button
            onClick={() => setMode("camera")}
            className={`px-3 py-2 rounded font-semibold ${
              mode === "camera"
                ? "bg-green-800 text-white"
                : "bg-blue-50 text-gray-700"
            }`}
          >
            Đăng nhập bằng Camera
          </button>
        </div>

        {/* PASSWORD MODE */}
        {mode === "password" && (
          <form className="grid gap-4 py-4" onSubmit={handleSubmit}>
            <div className="grid gap-1">
              <label htmlFor="email">Email :</label>
              <input
                type="email"
                id="email"
                className="bg-blue-50 p-2 border rounded outline-none focus:border-primary-200"
                name="email"
                value={data.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="password">Password :</label>
              <div className="bg-blue-50 p-2 border rounded flex items-center focus-within:border-primary-200">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="w-full outline-none"
                  name="password"
                  value={data.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <div
                  onClick={() => setShowPassword((preve) => !preve)}
                  className="cursor-pointer"
                >
                  {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                </div>
              </div>
              <Link
                to={"/forgot-password"}
                className="block ml-auto hover:text-primary-200"
              >
                Forgot password ?
              </Link>
            </div>

            <button
              disabled={!valideValue}
              className={`${
                valideValue ? "bg-green-800 hover:bg-green-700" : "bg-gray-500"
              } text-white py-2 rounded font-semibold my-3 tracking-wide`}
            >
              Login
            </button>
          </form>
        )}

        {/* CAMERA MODE */}
        {mode === "camera" && (
          <div className="py-2">
            <FaceLogin />
          </div>
        )}

        <p className="mt-2">
          {" "}
          Dont have account?{" "}
          <Link
            to={"/register"}
            className="font-semibold text-green-700 hover:text-green-800"
          >
            Register
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Login;
