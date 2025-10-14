export const socketConfig = (io) => {
  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    // Join room based on user role and dealership/manufacturer
    socket.on("joinRoom", (data) => {
      const {userRole, dealershipId, manufacturerId} = data;

      if (userRole === "Dealer Manager" || userRole === "Dealer Staff") {
        socket.join(`dealership_${dealershipId}`);
        console.log(
          `Socket ${socket.id} joined dealership room: ${dealershipId}`
        );
      }

      if (userRole === "EVM Staff" || userRole === "Admin") {
        socket.join("evm_staff");
        console.log(`Socket ${socket.id} joined EVM staff room`);
      }

      if (manufacturerId) {
        socket.join(`manufacturer_${manufacturerId}`);
        console.log(
          `Socket ${socket.id} joined manufacturer room: ${manufacturerId}`
        );
      }
    });

    // Khi nhận chatMessage từ client
    socket.on("chatMessage", (msg) => {
      console.log("Message received:", msg);
      // Phát lại cho tất cả client
      io.emit("message", msg);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

// Helper functions to emit notifications
export const emitVehicleDistribution = (io, data) => {
  const {dealershipId, vehicle, quantity, totalAmount} = data;

  const notification = {
    type: "vehicle_distribution",
    title: "Xe được phân bố",
    message: `Đã phân bố ${quantity} chiếc ${vehicle.name} - (${
      vehicle.color
    }) với tổng giá trị ${totalAmount.toLocaleString()} VND`,
    data: {
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        sku: vehicle.sku,
        price: vehicle.price,
        color: vehicle.color,
      },
      dealershipId,
      quantity,
      totalAmount,
      timestamp: new Date().toISOString(),
    },
  };

  // Gửi cho đại lý cụ thể
  io.to(`dealership_${dealershipId}`).emit("notification", notification);

  // Gửi cho EVM Staff để theo dõi
  io.to("evm_staff").emit("notification", notification);

  console.log("Vehicle distribution notification sent:", notification);
};

export const emitRequestStatusUpdate = (io, data) => {
  const {requestId, status, dealershipId, vehicle, quantity, reason} = data;

  const statusMessages = {
    approved: "được duyệt",
    rejected: "bị từ chối",
    pending: "đang chờ duyệt",
  };

  const notification = {
    type: "request_status_update",
    title: `Request ${statusMessages[status]}`,
    message:
      status === "approved"
        ? `Request ${quantity} chiếc ${vehicle.name} đã được duyệt`
        : status === "rejected"
        ? `Request ${quantity} chiếc ${vehicle.name} bị từ chối${
            reason ? ` - Lý do: ${reason}` : ""
          }`
        : `Request ${quantity} chiếc ${vehicle.name} đang chờ duyệt`,
    data: {
      requestId,
      status,
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        sku: vehicle.sku,
      },
      dealershipId,
      quantity,
      reason,
      timestamp: new Date().toISOString(),
    },
  };

  // Gửi cho đại lý cụ thể
  io.to(`dealership_${dealershipId}`).emit("notification", notification);

  // Gửi cho EVM Staff để theo dõi
  io.to("evm_staff").emit("notification", notification);

  console.log("Request status update notification sent:", notification);
};
