const getDateFilter = (filterParam, customStart, customEnd) => {
    const now = new Date();
    let startDate;
    let endDate;

    if (filterParam === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (filterParam === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
    } else if (filterParam === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filterParam === 'custom') {
        if (customStart) startDate = new Date(customStart);
        if (customEnd) endDate = new Date(customEnd);
    }

    if (startDate && endDate) {
        return { gte: startDate, lte: endDate };
    } else if (startDate) {
        return { gte: startDate };
    } else if (endDate) {
        return { lte: endDate };
    }

    return undefined;
};

module.exports = { getDateFilter };
