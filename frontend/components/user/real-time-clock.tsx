"use client"

import { useState, useEffect } from "react"


export default function RealTimeClock() {
  const [time, setTime] = useState(new Date())


  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])


  // Hàm định dạng ngày và giờ
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }


  // Hàm định dạng giờ
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  
  return (
    <div className="text-center">
      <div className="text-4xl font-bold">{formatTime(time)}</div>
      <div className="text-gray-500 mt-2">{formatDate(time)}</div>
    </div>
  )
}
