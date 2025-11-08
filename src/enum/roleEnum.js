// Định nghĩa role rõ ràng, dễ truy cập
export const ROLE = {
  DEALER_STAFF: "Dealer Staff",
  DEALER_MANAGER: "Dealer Manager",
  EVM_STAFF: "EVM Staff",
  ADMIN: "Admin",
};

// Danh sách roles
export const ROLES = Object.values(ROLE);

// Nhóm role theo quyền
export const DEALER_ROLES = [ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER];
export const EVM_ADMIN_ROLES = [ROLE.EVM_STAFF, ROLE.ADMIN];
export const EVM_MANAGEMENT_ROLES = [ROLE.EVM_STAFF, ROLE.DEALER_MANAGER];
export const MANAGEMENT_ROLES = [ROLE.DEALER_MANAGER, ROLE.ADMIN];
