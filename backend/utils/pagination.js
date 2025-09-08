const paginate = async (model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = 12,
    sort = { createdAt: -1 },
    populate = [],
    select = ''
  } = options;

  const skip = (page - 1) * limit;
  
  // Build the query
  let queryBuilder = model.find(query);
  
  if (select) queryBuilder = queryBuilder.select(select);
  if (populate.length > 0) {
    populate.forEach(pop => {
      queryBuilder = queryBuilder.populate(pop);
    });
  }
  
  // Execute queries in parallel
  const [data, total] = await Promise.all([
    queryBuilder.sort(sort).skip(skip).limit(limit),
    model.countDocuments(query)
  ]);
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

const buildSearchQuery = (searchTerm, searchFields) => {
  if (!searchTerm || !searchFields.length) return {};
  
  // Sanitize search term to prevent regex injection
  const sanitizedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Split search term into words for better matching
  const words = sanitizedTerm.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return {};
  
  // Create search conditions for each word
  const searchConditions = words.map(word => ({
    $or: searchFields.map(field => ({
      [field]: { $regex: word, $options: 'i' }
    }))
  }));
  
  // All words must match (AND logic)
  return searchConditions.length === 1 ? searchConditions[0] : { $and: searchConditions };
};

module.exports = { paginate, buildSearchQuery };