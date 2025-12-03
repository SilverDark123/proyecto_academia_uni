// models/paymentModel.js
const db = require("../db");

const Payment = {
  async createPaymentPlan(enrollmentId, totalAmount, installments) {
    const result = await db.query(
      "INSERT INTO payment_plans (enrollment_id, total_amount, installments) VALUES ($1, $2, $3) RETURNING id",
      [enrollmentId, totalAmount, installments]
    );
    return result.rows[0].id;
  },

  async createInstallment(paymentPlanId, installmentNumber, amount, dueDate) {
    const result = await db.query(
      "INSERT INTO installments (payment_plan_id, installment_number, amount, due_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [paymentPlanId, installmentNumber, amount, dueDate, "pending"]
    );
    return result.rows[0].id;
  },

  async getPaymentPlanByEnrollment(enrollmentId) {
    const result = await db.query(
      "SELECT * FROM payment_plans WHERE enrollment_id = $1",
      [enrollmentId]
    );
    return result.rows[0];
  },

  async getInstallmentsByPaymentPlan(paymentPlanId) {
    const result = await db.query(
      "SELECT * FROM installments WHERE payment_plan_id = $1 ORDER BY installment_number",
      [paymentPlanId]
    );
    return result.rows;
  },

  async updateInstallmentStatus(installmentId, status, voucherUrl = null) {
    const updates = ["status = $1"];
    const params = [status];
    let paramIndex = 2;

    if (voucherUrl) {
      updates.push(`voucher_url = $${paramIndex++}`);
      params.push(voucherUrl);
    }

    if (status === "paid") {
      updates.push("paid_at = CURRENT_TIMESTAMP");
    }

    params.push(installmentId);

    await db.query(
      `UPDATE installments SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );
    return true;
  },

  async getOverdueInstallments() {
    const result = await db.query(
      `SELECT i.*, pp.enrollment_id, e.student_id, s.first_name, s.last_name, s.parent_phone
       FROM installments i
       JOIN payment_plans pp ON i.payment_plan_id = pp.id
       JOIN enrollments e ON pp.enrollment_id = e.id
       JOIN students s ON e.student_id = s.id
       WHERE i.status = 'pending' AND i.due_date < CURRENT_DATE
       ORDER BY i.due_date ASC`
    );
    return result.rows;
  },

  async getTotalPaidByEnrollment(enrollmentId) {
    const result = await db.query(
      `SELECT SUM(amount) as total_paid
       FROM installments i
       JOIN payment_plans pp ON i.payment_plan_id = pp.id
       WHERE pp.enrollment_id = $1 AND i.status = 'paid'`,
      [enrollmentId]
    );
    return result.rows[0]?.total_paid || 0;
  },
};

module.exports = Payment;
