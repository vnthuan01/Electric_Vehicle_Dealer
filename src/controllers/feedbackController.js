import Feedback from "../models/Feedback.js";
import Customer from "../models/Customer.js";
import {created, success, error as errorRes} from "../utils/response.js";
import {FeedbackMessage} from "../utils/MessageRes.js";

export async function createFeedback(req, res, next) {
  try {
    const {customer_id, order_id, content, handler_id} = req.body;

    if (!customer_id || !content || !handler_id) {
      return errorRes(res, FeedbackMessage.MISSING_REQUIRED_FIELDS, 400);
    }

    const feedback = await Feedback.create({
      customer_id,
      order_id,
      content,
      handler_id,
      status: "in_progress",
    });
    const populated = await feedback.populate(
      "customer_id order_id handler_id"
    );

    return created(res, FeedbackMessage.CREATE_SUCCESS, populated);
  } catch (err) {
    next(err);
  }
}

export async function getFeedbacks(req, res, next) {
  try {
    const list = await Feedback.find().populate(
      "customer_id order_id handler_id"
    );
    return success(res, list);
  } catch (err) {
    next(err);
  }
}

export async function getFeedbackById(req, res, next) {
  try {
    const item = await Feedback.findById(req.params.id).populate(
      "customer_id order_id handler_id"
    );
    if (!item) return errorRes(res, FeedbackMessage.NOT_FOUND, 404);
    return success(res, item);
  } catch (err) {
    next(err);
  }
}

export async function updateFeedback(req, res, next) {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return errorRes(res, FeedbackMessage.NOT_FOUND, 404);

    // Chỉ Staff/Manager mới update
    const allowedRoles = ["Dealer Staff", "Dealer Manager"];
    if (!allowedRoles.includes(req.user.role)) {
      return errorRes(res, FeedbackMessage.FORBIDDEN, 403);
    }

    // Chỉ update các field ngoài status
    const {status, ...updateData} = req.body;

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      {new: true}
    ).populate("customer_id order_id handler_id");

    return success(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteFeedback(req, res, next) {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return errorRes(res, FeedbackMessage.NOT_FOUND, 404);
    return success(res, true);
  } catch (err) {
    next(err);
  }
}
