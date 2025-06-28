"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Camera, Loader2, AlertTriangle, Info, LogOut } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loadModels, detectFacesInVideo, verifyUserFace } from "@/lib/face-api"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

import RealTimeClock from "@/components/user/real-time-clock"
import AttendanceHistory from "@/components/user/attendance-history"
import UserProfile from "@/components/user/user-profile"


type User = {
  user_id: string;
  fullname: string;
  email: string;
  department: string;
  face_url: string;
}


type AttendanceResult = {
  success: boolean;
  message: string;
  timestamp?: string;
}


export default function UserDashboard() {
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const faceDetectionInterval = useRef<NodeJS.Timeout | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null)
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false) 
  const [faceCount, setFaceCount] = useState(0) 
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [toastShown, setToastShown] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const singleFaceConfirmCount = useRef(0)
  const SINGLE_FACE_CONFIRM_FRAMES = 10
  const [refreshHistory, setRefreshHistory] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [activeTab, setActiveTab] = useState("attendance")
  const { toast } = useToast()
  const router = useRouter()


  // Tải thông tin người dùng khi component được mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoadingUser(true)
      try {
        const data = await api.get('users/');
        setCurrentUser(data)
      } catch (error) {
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchUserInfo()
  }, [toast])


  // Xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    toast({
      title: "Đăng xuất thành công",
      description: "Bạn đã đăng xuất khỏi hệ thống",
    })
    router.push("/")
  }


  // Tải mô hình nhận diện khuôn mặt khi component được mount
  useEffect(() => {
    const initFaceApi = async () => {
      setIsLoadingModels(true)
      try {
        await loadModels()
      } catch (error) {
        toast({
          title: "Lỗi",
          description: "Không thể tải mô hình nhận diện khuôn mặt.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingModels(false)
      }
    }

    initFaceApi()
  }, [toast])


  // Dọn dẹp khi component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (faceDetectionInterval.current !== null) {
        clearTimeout(faceDetectionInterval.current)
        faceDetectionInterval.current = null
      }
    }
  }, [stream])


  // Xử lý khi camera được mở
  const handleOpenCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      })
      setStream(mediaStream)
      setIsCameraOpen(true)
      setAttendanceResult(null)
      setMultipleFacesDetected(false)
      setFaceCount(0)

      if (!canvasRef.current) {
        const canvas = document.createElement("canvas")
        canvas.style.display = "none"
        document.body.appendChild(canvas)
        canvasRef.current = canvas
      }

      startFaceDetection()
      console.log("Đã bắt đầu phát hiện khuôn mặt")
    } catch (error) {
      console.error("Lỗi khi mở camera:", error)
      toast({
        title: "Lỗi camera",
        description: "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.",
        variant: "destructive",
      })
    }
  }

  // Xử lý khi camera được đóng
  const handleCloseCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
    setMultipleFacesDetected(false)
    setFaceCount(0)
    setToastShown(false)
    singleFaceConfirmCount.current = 0

    if (faceDetectionInterval.current !== null) {
      clearTimeout(faceDetectionInterval.current)
      faceDetectionInterval.current = null
    }
  }

  // Xử lý khi chụp ảnh
  const handleCaptureImage = async () => {
    if (!stream || !videoRef.current || !currentUser || isProcessing) return;
    setIsProcessing(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (faceDetectionInterval.current) {
      clearInterval(faceDetectionInterval.current);
      faceDetectionInterval.current = null;
    }
    try {
      const video = videoRef.current;
  
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
  
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.95);
      });
  
      const result = await verifyUserFace(blob);
  
      setAttendanceResult({
        success: result.success,
        message: result.message,
        timestamp: result.timestamp,
      });
  
      if (result.success) {
        setRefreshHistory((prev) => prev + 1);
      }
      handleCloseCamera();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể chụp ảnh. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  // Phát hiện khuôn mặt trong video
  const detectFaces = async () => {
    if (!videoRef.current || !stream || videoRef.current.readyState !== 4 || isProcessing) return;
  
    try {
      const result = await detectFacesInVideo(videoRef.current);
      const currentFaceCount = result.faceCount;
      setFaceCount(currentFaceCount);
      if (currentFaceCount === 0) {
        if (!toastShown && !isProcessing) {
          toast({
            title: "Cảnh báo",
            description: "Không phát hiện khuôn mặt. Vui lòng đưa khuôn mặt vào khung hình.",
            variant: "destructive",
          });
          setToastShown(true);
        }
        setMultipleFacesDetected(false);
        singleFaceConfirmCount.current = 0;
      } else if (currentFaceCount === 1) {
        setMultipleFacesDetected(false);
        singleFaceConfirmCount.current += 1;

        if (singleFaceConfirmCount.current >= SINGLE_FACE_CONFIRM_FRAMES) {
          if (!isProcessing) {
            console.log("Tự động chụp ảnh vì khuôn mặt ổn định");
            await handleCaptureImage();
          }
        }
      } else {
        if (!toastShown && !isProcessing) {
          toast({
            title: "Cảnh báo",
            description: `Phát hiện ${faceCount} khuôn mặt trong khung hình. Vui lòng đảm bảo chỉ có một khuôn mặt.`,
            variant: "destructive",
          })
          setToastShown(true)
        }
        setMultipleFacesDetected(true);
        singleFaceConfirmCount.current = 0;
      }
    } catch (error) {
      console.error("Lỗi khi phát hiện khuôn mặt:", error);
    }
  };


  // Bắt đầu phát hiện khuôn mặt với khoảng thời gian 250ms
  const startFaceDetection = () => {
    if (faceDetectionInterval.current) {
      clearInterval(faceDetectionInterval.current);
    }
  
    faceDetectionInterval.current = setInterval(detectFaces, 250);
  };


  // Hiệu ứng chuyển tiếp khi mở/đóng camera
  const overlayStyle = {
    opacity: multipleFacesDetected ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out'
  }

  
  // Hiệu ứng chuyển tiếp khi chụp ảnh
  const videoContainerStyle = {
    transition: 'transform 0.3s ease-in-out',
    transform: isTransitioning ? 'scale(0.99)' : 'scale(1)'
  }


  // Hiển thị thông báo khi đang tải thông tin người dùng
  if (isLoadingUser) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">Đang tải thông tin người dùng...</p>
      </div>
    )
  }


  if (!currentUser) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.</AlertDescription>
        </Alert>
      </div>
    )
  }

  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Hệ thống điểm danh</h1>
        <Button variant="destructive" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance">Điểm danh</TabsTrigger>
          <TabsTrigger value="profile">Thông tin cá nhân</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Điểm danh hôm nay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <RealTimeClock />
                </div>

                {attendanceResult && (
                  <Alert
                    variant={attendanceResult.success ? "default" : "destructive"}
                    className={attendanceResult.success ? "bg-green-50 border-green-200" : undefined}
                  >
                    <AlertTitle>{attendanceResult.success ? "Điểm danh thành công" : "Điểm danh thất bại"}</AlertTitle>
                    <AlertDescription>
                      {attendanceResult.message}
                      {attendanceResult.timestamp && (
                        <div className="mt-2 font-medium">Thời gian: {attendanceResult.timestamp}</div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-center">
                  {!isCameraOpen ? (
                    <Button onClick={handleOpenCamera} className="flex items-center gap-2" disabled={isLoadingModels}>
                      {isLoadingModels ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang tải mô hình...
                        </>
                      ) : (
                        <>
                          <Camera className="h-5 w-5" />
                          Điểm danh bằng khuôn mặt
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative border rounded-lg overflow-hidden" style={videoContainerStyle}>
                        <video
                          autoPlay={!isProcessing}
                          playsInline
                          ref={(videoElement) => {
                            if (videoElement && stream) {
                              videoElement.srcObject = stream
                              videoRef.current = videoElement
                              videoElement.onloadeddata = () => {
                                startFaceDetection()
                              }
                            }
                          }}
                          className="w-full h-auto"
                          style={{ 
                            transform: 'scaleX(-1)' 
                          }}
                        />

                        {multipleFacesDetected && (
                          <div
                            className={`absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm ${multipleFacesDetected ? 'pointer-events-auto' : 'pointer-events-none'}`}
                            style={overlayStyle}
                          >
                            <div className="bg-white p-4 rounded-md max-w-xs text-center transform transition-transform duration-300 hover:scale-105">
                              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                              <p className="font-medium text-red-600">Phát hiện {faceCount} khuôn mặt!</p>
                              <p className="text-sm mt-1">Vui lòng đảm bảo chỉ có khuôn mặt của bạn trong khung hình</p>
                            </div>
                          </div>
                        )}
                        {isProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 opacity-100 pointer-events-auto">
                            <div className="bg-white p-6 rounded-md max-w-xs text-center shadow-lg">
                              <Loader2 className="h-10 w-10 text-blue-600 mx-auto mb-4 animate-spin" />
                              <p className="font-semibold text-lg text-gray-800">Đang xử lý điểm danh...</p>
                              <p className="text-sm text-gray-600 mt-2">Vui lòng chờ trong giây lát.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-center">
                        <Button onClick={handleCloseCamera} variant="outline">
                          Hủy
                        </Button>
                      </div>

                      <Alert variant="default" className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Hướng dẫn</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-5 text-sm space-y-1">
                            <li>Đảm bảo khuôn mặt của bạn nằm trong khung hình</li>
                            <li>Đảm bảo ánh sáng đủ sáng và rõ ràng</li>
                            <li>Chỉ có duy nhất khuôn mặt của bạn trong khung hình</li>
                            <li>Không đeo kính râm hoặc che khuôn mặt</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lịch sử điểm danh</CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceHistory userId={currentUser.user_id} refreshTrigger={refreshHistory} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <UserProfile user={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  )
}