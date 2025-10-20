import Feedback from "../models/Feedback.js";
import {created, success, error as errorRes} from "../utils/response.js";
import {FeedbackMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";

export async function createFeedback(req, res, next) {
  try {
    const {customer_id, content} = req.body;

    if (!customer_id || !content) {
      return errorRes(res, FeedbackMessage.MISSING_REQUIRED_FIELDS, 400);
    }

    const feedback = await Feedback.create({
      customer_id,
      dealership_id: req.user?.dealership_id,
      content,
      status: "new",
    });
    const populated = await feedback.populate("customer_id");

    return created(res, FeedbackMessage.CREATE_SUCCESS, populated);
  } catch (err) {
    next(err);
  }
}

export async function getFeedbacks(req, res, next) {
  try {
    // ----- Paginate, scoped by dealership -----
    const baseQuery = {dealership_id: req.user?.dealership_id};
    const result = await paginate(
      Feedback,
      req,
      ["content", "status"],
      baseQuery
    );

    // ----- Populate after paginate -----
    const dataWithPopulate = await Feedback.populate(result.data, [
      {path: "customer_id", select: "name email phone"},
    ]);

    return success(res, FeedbackMessage.RETRIEVED_SUCCESS, {
      ...result,
      data: dataWithPopulate,
    });
  } catch (err) {
    next(err);
  }
}

// Update only status field
export async function updateFeedbackStatus(req, res, next) {
  try {
    const {status} = req.body;
    const allowed = ["new", "in_progress", "resolved", "rejected"];
    if (!status || !allowed.includes(status)) {
      return errorRes(res, FeedbackMessage.INVALID_REQUEST, 400);
    }
    const updated = await Feedback.findOneAndUpdate(
      {_id: req.params.id, dealership_id: req.user?.dealership_id},
      {status},
      {new: true}
    ).populate("customer_id");
    if (!updated) return errorRes(res, FeedbackMessage.NOT_FOUND, 404);
    return success(res, FeedbackMessage.STATUS_UPDATE_SUCCESS, updated);
  } catch (err) {
    next(err);
  }
}

// Add a processing comment
export async function addFeedbackComment(req, res, next) {
  try {
    const {comment, user_id} = req.body;
    if (!comment || !user_id) {
      return errorRes(res, FeedbackMessage.MISSING_REQUIRED_FIELDS, 400);
    }
    const updated = await Feedback.findOneAndUpdate(
      {_id: req.params.id, dealership_id: req.user?.dealership_id},
      {$push: {comments: {comment, user_id}}},
      {new: true}
    ).populate("customer_id");
    if (!updated) return errorRes(res, FeedbackMessage.NOT_FOUND, 404);
    return success(res, FeedbackMessage.COMMENT_ADDED, updated);
  } catch (err) {
    next(err);
  }
}
