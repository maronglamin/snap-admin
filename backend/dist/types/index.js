"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementType = exports.SettlementStatus = exports.PaymentStatus = exports.OrderStatus = exports.ProductCondition = exports.ProductStatus = exports.KycStatus = exports.UserStatus = exports.UserType = void 0;
var UserType;
(function (UserType) {
    UserType["BUYER"] = "BUYER";
    UserType["SELLER"] = "SELLER";
})(UserType || (exports.UserType = UserType = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["PENDING"] = "PENDING";
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var KycStatus;
(function (KycStatus) {
    KycStatus["PENDING"] = "PENDING";
    KycStatus["VERIFIED"] = "VERIFIED";
    KycStatus["REJECTED"] = "REJECTED";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["PENDING"] = "PENDING";
    ProductStatus["ACTIVE"] = "ACTIVE";
    ProductStatus["INACTIVE"] = "INACTIVE";
    ProductStatus["SUSPENDED"] = "SUSPENDED";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
var ProductCondition;
(function (ProductCondition) {
    ProductCondition["NEW"] = "NEW";
    ProductCondition["LIKE_NEW"] = "LIKE_NEW";
    ProductCondition["GOOD"] = "GOOD";
    ProductCondition["FAIR"] = "FAIR";
    ProductCondition["POOR"] = "POOR";
})(ProductCondition || (exports.ProductCondition = ProductCondition = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["CONFIRMED"] = "CONFIRMED";
    OrderStatus["SHIPPED"] = "SHIPPED";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["REFUNDED"] = "REFUNDED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var SettlementStatus;
(function (SettlementStatus) {
    SettlementStatus["PENDING"] = "PENDING";
    SettlementStatus["PROCESSING"] = "PROCESSING";
    SettlementStatus["COMPLETED"] = "COMPLETED";
    SettlementStatus["FAILED"] = "FAILED";
    SettlementStatus["CANCELLED"] = "CANCELLED";
})(SettlementStatus || (exports.SettlementStatus = SettlementStatus = {}));
var SettlementType;
(function (SettlementType) {
    SettlementType["PAYOUT"] = "PAYOUT";
    SettlementType["REFUND"] = "REFUND";
    SettlementType["COMMISSION"] = "COMMISSION";
})(SettlementType || (exports.SettlementType = SettlementType = {}));
//# sourceMappingURL=index.js.map