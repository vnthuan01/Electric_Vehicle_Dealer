// utils/pagination.js
export const paginate = async (
  model,
  req,
  searchFields = [],
  extraQuery = {}
) => {
  let { page = 1, limit = 10, search = "", sort } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const skip = (page - 1) * limit;

  // ----- SEARCH -----
  let searchQuery = { ...extraQuery };
  if (search && searchFields.length > 0) {
    const regex = new RegExp(search, "i"); // case-insensitive
    searchQuery.$or = searchFields.map((field) => ({ [field]: regex }));
  }

  // ----- SORT -----
  let sortQuery = {};
  if (sort) {
    // support multiple sorts ?sort=name:asc,createdAt:desc
    const sortFields = sort.split(",");
    sortFields.forEach((field) => {
      const [key, direction] = field.split(":");
      sortQuery[key] = direction === "desc" ? -1 : 1;
    });
  } else {
    // default sort
    sortQuery = { createdAt: -1 };
  }

  // ----- COUNT -----
  const totalRecords = await model.countDocuments(searchQuery);

  // ----- DATA -----
  const data = await model
    .find(searchQuery)
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);

  return {
    page,
    limit,
    totalPages: Math.ceil(totalRecords / limit),
    totalRecords,
    sort: sortQuery,
    data,
  };
};

// Example response with pagination
// app.get("/api/users", async (req, res) => {
//   try {
//     // Chỉ cần gọi 1 lần, field ["name","email"] là các field cần tìm kiếm (searching)
//     const result = await paginate(User, req, ["name", "email"], extraQuery);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({error: err.message});
//   }
// });
