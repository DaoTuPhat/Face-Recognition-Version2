FROM python:3.10-slim

WORKDIR /app

# Cài đặt pip và các công cụ cần thiết
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxrender1 libxext6 curl

# Cài đặt thư viện Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép mã nguồn vào thư mục /app
COPY src ./src

EXPOSE 8000

# Chạy ứng dụng
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]