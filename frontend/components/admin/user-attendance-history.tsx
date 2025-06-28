"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, getYear, getMonth, getDate, set } from "date-fns"
import { vi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api";


type AttendanceStatus = "On time" | "Late" | "Pending"


type AttendanceRecord = {
  attendance_id: string
  date: string
  time: string | null
  status: AttendanceStatus
}

interface UserAttendanceHistoryProps {
  userId: string
  userName: string
}
export default function UserAttendanceHistory({ userId, userName }: UserAttendanceHistoryProps) {
  const [allAttendances, setAllAttendances] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedDay, setSelectedDay] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const { toast } = useToast()


  // Lấy tất cả dữ liệu điểm danh khi component mount
  useEffect(() => {
    const fetchAllAttendances = async () => {
      setIsLoading(true)
      try {
        // Gọi API để lấy dữ liệu điểm danh
        const data = await api.get<AttendanceRecord[]>(`admins/attendance/${userId}`);
        
        setAllAttendances(data)

      } catch (error: any) {
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tải lịch sử điểm danh",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false)
      }
    };

    fetchAllAttendances()
  }, [userId]);


  // Bộ lọc dữ liệu điểm danh theo năm, tháng, ngày và trạng thái
  const filteredAttendances = useMemo(() => {
    return allAttendances.filter((record) => {
      const recordDate = new Date(record.date)
      const recordYear = recordDate.getFullYear().toString()
      const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, "0")
      const recordDay = recordDate.getDate().toString().padStart(2, "0")

      // Filter theo năm
      if (selectedYear !== "all" && recordYear !== selectedYear) {
        return false
      }

      // Filter theo tháng
      if (selectedMonth !== "all" && recordMonth !== selectedMonth) {
        return false
      }

      // Filter theo ngày
      if (selectedDay !== "all" && recordDay !== selectedDay) {
        return false
      }

      // Filter theo trạng thái
      if (selectedStatus !== "all" && record.status !== selectedStatus) {
        return false
      }

      return true
    })
  }, [allAttendances, selectedYear, selectedMonth, selectedDay, selectedStatus])


  // Lấy danh sách năm có dữ liệu
  const getAvailableYears = () => {
    const years = allAttendances.map((record) => getYear(new Date(record.date)))
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a)

    return [
      { value: "all", label: "Tất cả các năm" },
      ...uniqueYears.map((year) => ({
        value: year.toString(), 
        label: `Năm ${year.toString()}`,
      })),
    ]
  }


  // Lấy danh sách tháng có dữ liệu
  const getAvailableMonths = () => {
    const months = allAttendances.map((record) => getMonth(new Date(record.date)) + 1) // getMonth() trả về 0-11
    const uniqueMonths = [...new Set(months)].sort((a, b) => a - b)

    return [
      { value: "all", label: "Tất cả các tháng" },
      ...uniqueMonths.map((month) => ({
        value: month.toString().padStart(2, "0"),
        label: `Tháng ${month.toString().padStart(2, "0")}`,
      })),
    ]
  }


  // Lấy danh sách ngày có dữ liệu
  const getAvailableDays = () => {
    const days = allAttendances.map((record) => getDate(new Date(record.date)))
    const uniqueDays = [...new Set(days)].sort((a, b) => a - b)

    return [
      { value: "all", label: "Tất cả các ngày" },
      ...uniqueDays.map((day) => ({
        value: day.toString().padStart(2, "0"),
        label: `Ngày ${day.toString().padStart(2, "0")}`,
      })),
    ]
  }


  // Lấy tất cả trạng thái có thể
  const getAvailableStatus = () => {
    const statuses = allAttendances.map((record) => record.status)
    const uniqueStatuses = [...new Set(statuses)]

    const statusOptions = [{ value: "all", label: "Tất cả trạng thái", color: "text-gray-600" }]

    if (uniqueStatuses.includes("On time")) {
      statusOptions.push({ value: "On time", label: "Đúng giờ", color: "text-green-600" })
    }
    if (uniqueStatuses.includes("Late")) {
      statusOptions.push({ value: "Late", label: "Muộn", color: "text-amber-600" })
    }
    if (uniqueStatuses.includes("Pending")) {
      statusOptions.push({ value: "Pending", label: "Chưa điểm danh", color: "text-gray-500" })
    }
    return statusOptions
  }


  // Định dạng ngày hiển thị
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, dd/MM/yyyy", { locale: vi })
  }


  // Hiển thị trạng thái điểm danh
  const getStatusDisplay = (status: AttendanceStatus) => {
    const statusOption = getAvailableStatus().find((option) => option.value === status)
    if (!statusOption) return null

    return (
      <>
        <span className={statusOption.color}>{statusOption.label}</span>
      </>
    )
  }


  const yearOptions = getAvailableYears()
  const monthOptions = getAvailableMonths()
  const dayOptions = getAvailableDays()
  const statusOptions = getAvailableStatus()

  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lịch sử điểm danh của {userName}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 4 cột bộ lọc */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Lọc theo năm */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Năm</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lọc theo tháng */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tháng</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lọc theo ngày */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ngày</label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lọc theo trạng thái */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Thông tin tổng quan */}
          <div className="text-sm text-gray-600 mb-4">
          </div>

          {/* Hiển thị trạng thái loading */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : filteredAttendances.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {allAttendances.length === 0 ? "Không có dữ liệu điểm danh" : "Không tìm thấy dữ liệu với bộ lọc hiện tại"}
            </div>
          ) : (
            <>
              {/* Bảng hiển thị lịch sử điểm danh */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Giờ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendances.map((record) => (
                      <TableRow key={record.attendance_id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>{record.time ? record.time.replace("Z", "") : "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">{getStatusDisplay(record.status)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Thống kê */}
              <div className="flex justify-between items-center text-sm text-gray-500 pt-2">
                <div>Hiển thị: {filteredAttendances.length} bản ghi</div>
                <div>
                  Đúng giờ: {filteredAttendances.filter((r) => r.status === "On time").length} | 
                  Muộn:{" "} {filteredAttendances.filter((r) => r.status === "Late").length} | 
                  Chưa điểm danh:{" "} {filteredAttendances.filter((r) => r.status === "Pending").length}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
