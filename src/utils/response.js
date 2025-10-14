// Success response helper
export function success(res, message = "OK", data = null, status = 200) {
  return res
    .status(status)
    .json({status: status, success: true, message, data});
}

// Created response helper
export function created(res, message = "Created", data = null) {
  return res.status(201).json({success: true, message, data});
}

// Error response helper
export function error(res, message = "Error", status = 400, err) {
  return res
    .status(status)
    .json({status: status, success: false, message, error: err});
}
