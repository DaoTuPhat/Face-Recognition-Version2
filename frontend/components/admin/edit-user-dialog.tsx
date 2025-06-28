"use client";

import type React from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { api } from "@/lib/api";


type UserRole = "User" | "Admin";


type User = {
  user_id: number;
  fullname: string;
  email: string;
  role: UserRole;
  department: string;
  face_url?: string;
};


interface EditUserDialogProps {
  user: User;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

export default function EditUserDialog({user, onClose, onUserUpdated,}: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullname: user.fullname,
    email: user.email,
    role: user.role,
    department: user.department,
  });
  const [faceImage, setFaceImage] = useState<string | null>(null);  
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  // Xử lý thay đổi input trong form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      if (formData.username) formDataToSend.append("username", formData.username);
      if (formData.password) formDataToSend.append("password", formData.password);
      if (formData.fullname) formDataToSend.append("fullname", formData.fullname);
      if (formData.email) formDataToSend.append("email", formData.email);
      if (formData.role) formDataToSend.append("role", formData.role);
      if (formData.department) formDataToSend.append("department", formData.department);
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


      // Sử dụng api.putForm thay vì fetch trực tiếp
      const responseData = await api.putForm(`admins/${user.user_id}`, formDataToSend);
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin người dùng",
      });
      // Cập nhật lại user ở component cha
      onUserUpdated({
        ...user,
        fullname: formData.fullname,
        email: formData.email,
        role: formData.role as UserRole,
        department: formData.department
      });
      
      // Đóng dialog sau khi cập nhật thành công
      setTimeout(() => {
        onClose();
        router.refresh(); // Refresh trang để cập nhật UI
      }, 100);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật thông tin người dùng",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin người dùng. Những trường không thay đổi có thể để trống.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Trường nhập tên đăng nhập */}
            <div className="space-y-2">
              <Label htmlFor="edit-username">Tên đăng nhập</Label>
              <Input
                id="edit-username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Tên đăng nhập tối thiểu 8 ký tự"
              />
            </div>
            {/* Trường nhập mật khẩu */}
            <div className="space-y-2">
              <Label htmlFor="edit-password">Mật khẩu mới</Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mật khẩu tối thiểu 8 ký tự"
              />
            </div>
            {/* Trường nhập họ tên */}
            <div className="space-y-2">
              <Label htmlFor="edit-fullname">Họ tên</Label>
              <Input
                id="edit-fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                required
              />
            </div>
            {/* Trường nhập email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            {/* Trường chọn phòng ban */}
            <div className="space-y-2">
              <Label htmlFor="edit-department">Phòng ban</Label>
              <Input
                id="edit-department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>
            {/* Trường chọn vai trò */}
            <div className="space-y-2">
              <Label htmlFor="edit-role">Vai trò</Label>
              <select
                id="edit-role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="User">Người dùng</option>
                <option value="Admin">Quản trị viên</option>
              </select>
            </div>
            {/* Trường tải ảnh khuôn mặt */}
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}