"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { api } from "@/lib/api";

interface AddUserFormProps {
  onUserAdded: () => void;
}


export default function AddUserForm({ onUserAdded }: AddUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "User",
    fullname: "",
    email: "",
    department: "",
  });
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const { toast } = useToast();


  // Hàm kiểm tra tính hợp lệ của form
  const validateForm = () => {
    if (!formData.username || formData.username.length <8) {
      toast({
        title: "Lỗi",
        description: "Tên đăng nhập phải dài ít nhất 8 ký tự",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải dài ít nhất 8 ký tự",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.fullname) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập họ và tên",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: "Lỗi",
        description: "Email không hợp lệ",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.department) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập phòng ban",
        variant: "destructive",
      });
      return false;
    }
    if (!faceFile) {
      toast({
        title: "Lỗi",
        description: "Vui lòng cung cấp ảnh khuôn mặt",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };


  // Kiểm tra form hợp lệ để enable/disable nút submit
  const isFormValid = () => {
    return (
      formData.username &&
      formData.password &&
      formData.fullname &&
      formData.email &&
      formData.department &&
      faceFile &&
      formData.username.length >= 8 &&
      formData.password.length >= 8 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    );
  };


  // Xử lý thay đổi input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  // Xử lý thay đổi select
  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };


  // Xử lý tải file ảnh
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra kích thước file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "Ảnh khuôn mặt không được vượt quá 5MB",
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra định dạng file
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({
        title: "Lỗi",
        description: "Chỉ chấp nhận file JPG hoặc PNG",
        variant: "destructive",
      });
      return;
    }

    setFaceFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setFaceImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };


  // Xóa ảnh
  const handleRemoveImage = () => {
    setFaceImage(null);
    setFaceFile(null);
  };

  
  // Xử lý submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("username", formData.username);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("role", formData.role);
      formDataToSend.append("fullname", formData.fullname);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("department", formData.department);
      
      // Đảm bảo có file ảnh và đính kèm đúng định dạng
      if (faceFile) {
        console.log("Face file type:", faceFile.type);
        console.log("Face file size:", faceFile.size);
        formDataToSend.append("face_image", faceFile);
      } else {
        toast({
          title: "Lỗi",
          description: "Vui lòng cung cấp ảnh khuôn mặt",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Log form data keys
      console.log("FormData keys:");
      for (const pair of formDataToSend.entries()) {
        console.log(`${pair[0]}: ${pair[1] instanceof File ? 'File object' : pair[1]}`);
      }

      console.log("Gửi request đến API...");
      try {
        // Sử dụng API utility để thêm người dùng mới
        const data = await api.postForm("admins/", formDataToSend);
        console.log("Kết quả từ API:", data);

        toast({
          title: "Thành công",
          description: `Đã thêm người dùng ${data.fullname || 'mới'}`,
        });

        // Reset form
        setFormData({
          username: "",
          email: "",
          password: "",
          role: "User",
          department: "",
          fullname: "",
        });
        setFaceImage(null);
        setFaceFile(null);

        // Gọi callback để thông báo component cha
        onUserAdded();
      } catch (apiError: any) {
        console.error("API Error:", apiError);
        throw apiError;
      }
    } catch (error: any) {
      console.error("Lỗi khi thêm user:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm người dùng mới",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Thêm người dùng mới</CardTitle>
          <CardDescription>
            Nhập thông tin để tạo tài khoản người dùng mới. Với quyền quản trị viên, bạn có thể tạo cả tài khoản người
            dùng và tài khoản quản trị viên.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Tên đăng nhập tối thiểu 8 ký tự"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mật khẩu tối thiểu 8 ký tự"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">Họ và tên</Label>
              <Input
                id="fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                placeholder="Nhập họ và tên"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Nhập email"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">Người dùng</SelectItem>
                  <SelectItem value="Admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Phòng ban</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Nhập phòng ban"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ảnh khuôn mặt</Label>

            {faceImage ? (
              <div className="relative w-40 h-40 mx-auto border rounded-lg overflow-hidden">
                <img src={faceImage} alt="Ảnh khuôn mặt" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  <div>
                    <Input
                      id="face-image"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("face-image")?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Tải ảnh lên
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Vui lòng cung cấp ảnh khuôn mặt rõ ràng (JPG hoặc PNG, tối đa 5MB)
                </p>
              </div>
              )
            }
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !isFormValid()}>
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang xử lý...
              </>
            ) : (
              "Thêm người dùng"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}