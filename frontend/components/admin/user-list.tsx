"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, MoreVertical, User, Shield, Search, Building, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import EditUserDialog from "@/components/admin/edit-user-dialog";


type UserRole = "User" | "Admin";


type UserType = {
  user_id: number;
  fullname: string;
  email: string;
  role: UserRole;
  department: string;
  face_url?: string;
};


type UserListProps = {
  refreshTrigger: number
}


export default function UserList({ refreshTrigger}: UserListProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToEdit, setUserToEdit] = useState<UserType | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const { toast } = useToast();
  const router = useRouter();


  // Lấy danh sách người dùng từ API
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<UserType[]>(`admins/`);
      setUsers(data);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải danh sách người dùng",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  // Lấy danh sách người dùng khi component mount hoặc khi refreshTrigger thay đổi
  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);


  // Xử lý sự kiện tìm kiếm
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };


  // Cập nhật giá trị tìm kiếm khi người dùng nhập
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };


  // Sử dụng hook để debounce giá trị tìm kiếm
  const debouncedSearchTerm = useDebounce(searchInput, 500);


  // Cập nhật giá trị tìm kiếm khi giá trị debounce thay đổi
  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);


  // Lấy danh sách phòng ban duy nhất từ danh sách người dùng
  const departments = Array.from(new Set(users.map((record) => record.department)));


  // Lọc người dùng dựa trên các tiêu chí tìm kiếm và lọc
  const filteredUsers = useMemo(() => {
    return users.filter((record) => {
      if (searchTerm !== "" && !record.fullname.toLowerCase().includes(searchTerm.toLowerCase()) && !record.email.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (departmentFilter !== "all" && record.department !== departmentFilter) {
        return false;
      }
      if (roleFilter !== "all" && record.role !== roleFilter) {
        return false;
      }
      return true;
    })
  }, [users, searchTerm, departmentFilter, roleFilter]);


  // Xử lý sự kiện xem lịch sử điểm danh của người dùng
  const handleViewAttendanceHistory = (userId: number, userName: string) => {
    router.push(`/admin/user-attendance/${userId}?name=${encodeURIComponent(userName)}`);
  };


  // Xử lý sự kiện cập nhật thông tin người dùng
  const handleUserUpdated = () => {
    fetchUsers();
    setUserToEdit(null);
    toast({
      title: "Thành công",
      description: "Đã cập nhật thông tin người dùng",
    });
  };


  // Xử lý sự kiện xóa người dùng
  const handleDeleteUser = async (userId: number, userName: string) => {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${userName}" không?`)
    if (!confirmed) return;
    try {
      await api.delete(`admins/${userId}`)
      toast({
        title: "Thành công",
        description: "Đã xóa người dùng",
      })
      await fetchUsers()
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa người dùng",
        variant: "destructive",
      });
    }
  };

  
return (
  <div className="space-y-4">
    {/* Thông tin quyền quản trị viên */}
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
      <h3 className="text-sm font-medium text-blue-800 mb-1">
        Quyền quản trị viên
      </h3>
      <p className="text-sm text-blue-700">
        Quản trị viên có thể chỉnh sửa thông tin của tất cả người dùng, thêm
        người dùng mới, xóa người dùng.
      </p>
    </div>

    {/* Bộ lọc */}
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      {/* Tìm kiếm theo tên hoặc email */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          type="search"
          placeholder="Tìm kiếm theo tên hoặc email"
          className="pl-8"
          value={searchInput}
          onChange={handleSearchChange}
        />
      </form>

      {/* Lọc theo phòng ban */}
      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Phòng ban" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả phòng ban</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Lọc theo vai trò */}
      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Vai trò" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả vai trò</SelectItem>
          <SelectItem value="Admin">Quản trị viên</SelectItem>
          <SelectItem value="User">Người dùng</SelectItem>
        </SelectContent>
      </Select>
    </div>
  
    {isLoading ? (
      <div className="flex justify-center py-8">
        <svg
          className="animate-spin h-8 w-8 text-blue-500"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    ) : (
      <>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-gray-500"
                  >
                    Không tìm thấy người dùng nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.face_url ? (
                          <img
                            src={user.face_url}
                            alt={user.fullname}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) =>
                              (e.currentTarget.src = "/placeholder.svg")
                            }
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        {user.fullname}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span>{user.department}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.role === "Admin" ? (
                          <>
                            <Shield className="h-4 w-4 text-purple-500" />
                            <span className="text-purple-600">Quản trị viên</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-600">Người dùng</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Mở menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setUserToEdit(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Chỉnh sửa</span>
                          </DropdownMenuItem>
                          {user.role !== "Admin" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewAttendanceHistory(
                                user.user_id,
                                user.fullname
                              )
                            }
                          >
                            <History className="mr-2 h-4 w-4" />
                            <span>Lịch sử điểm danh</span>
                          </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteUser(user.user_id, user.fullname)
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Xóa</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {userToEdit && (
          <EditUserDialog
            user={userToEdit}
            onClose={() => setUserToEdit(null)}
            onUserUpdated={handleUserUpdated}
          />
        )}
      </>
    )}
    <div className="flex justify-between items-center text-sm text-gray-500 pt-2">
      <div>Tổng số: {filteredUsers.length} nhân viên</div>
    </div>
  </div>
  );
}