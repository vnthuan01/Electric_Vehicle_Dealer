export const socketConfig = (io) => {
  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    // Khi nhận chatMessage từ client
    socket.on("chatMessage", (msg) => {
      // Chuẩn hóa message thành object đầy đủ
      //Khi nào cần sài cho các route nào thì thêm vào đây
      console.log("Message received:", msg);

      // Phát lại cho tất cả client
      io.emit("message", msg);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};
