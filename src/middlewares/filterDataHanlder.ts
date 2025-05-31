import { fetchUserId } from "./AuthMiddleware";

// User data filter middleware
const userDataFilter = (req:any, res:any, next:any) => {
  try {
    // Get user ID from your existing function
    const userId = fetchUserId();
    console.log("userId", userId);

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    // Store the original res.json method
    const originalJson = res.json;

    // Override res.json to filter data before sending
    res.json = function (data:any) {
      let filteredData = data;

      // Handle different response structures
      if (Array.isArray(data)) {
        // Filter array of objects
        filteredData = data.filter(
          (item) =>
            item.createdBy && item.createdBy.toString() === userId.toString()
        );
      } else if (data && typeof data === "object") {
        // Handle object responses
        if (data.data && Array.isArray(data.data)) {
          // Handle paginated responses like { data: [...], total: x, page: y }
          filteredData = {
            ...data,
            data: data.data.filter(
              (item: any) =>
                item.createdBy &&
                item.createdBy.toString() === userId.toString()
            ),
          };
          // Update total count if it exists
          if (filteredData.total !== undefined) {
            filteredData.total = filteredData.data.length;
          }
        } else if (data.createdBy) {
          // Handle single object response
          if (data.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
              error: "Access denied: You can only view your own data",
            });
          }
        }
      }

      // Call the original json method with filtered data
      return originalJson.call(this, filteredData);
    };

    next();
  } catch (error) {
    console.error("Error in user data filter middleware:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// Alternative version for specific route usage
const createUserFilter = (createdByField = "createdBy") => {
  return (req:any, res:any, next:any) => {
    try {
      const userId = fetchUserId();

      if (!userId) {
        return res.status(401).json({
          error: "User not authenticated",
        });
      }

      const originalJson = res.json;

      res.json = function (data: any) {
        let filteredData = data;

        if (Array.isArray(data)) {
          filteredData = data.filter(
            (item) =>
              item[createdByField] &&
              item[createdByField].toString() === userId.toString()
          );
        } else if (data && typeof data === "object") {
          if (data.data && Array.isArray(data.data)) {
            filteredData = {
              ...data,
              data: data.data.filter(
                (item: any) =>
                  item[createdByField] &&
                  item[createdByField].toString() === userId.toString()
              ),
            };
            if (filteredData.total !== undefined) {
              filteredData.total = filteredData.data.length;
            }
          } else if (data[createdByField]) {
            if (data[createdByField].toString() !== userId.toString()) {
              return res.status(403).json({
                error: "Access denied: You can only view your own data",
              });
            }
          }
        }

        return originalJson.call(this, filteredData);
      };

      next();
    } catch (error) {
      console.error("Error in user filter middleware:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  };
};

// Usage examples:

// Method 1: Apply to all routes
// app.use(userDataFilter);

// Method 2: Apply to specific routes
// app.get('/api/posts', userDataFilter, getPosts);
// app.get('/api/comments', userDataFilter, getComments);

// Method 3: Use configurable version with custom field name
// app.get('/api/orders', createUserFilter('ownerId'), getOrders);
// app.get('/api/tasks', createUserFilter('assignedTo'), getTasks);

// Method 4: Apply to route group
// const apiRouter = express.Router();
// apiRouter.use(userDataFilter);
// apiRouter.get('/posts', getPosts);
// apiRouter.get('/comments', getComments);
// app.use('/api', apiRouter);

export { userDataFilter, createUserFilter };
