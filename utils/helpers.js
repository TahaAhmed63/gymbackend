/**
 * Format a phone number for WhatsApp deep linking
 * @param {string} phone - Phone number
 * @returns {string} WhatsApp deep link
 */
const getWhatsAppLink = (phone) => {
  // Remove any non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
};

/**
 * Calculate membership expiry date
 * @param {Date} startDate - Start date
 * @param {number} durationMonths - Duration in months
 * @returns {Date} Expiry date
 */
const calculateExpiryDate = (startDate, durationMonths) => {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + durationMonths);
  return date;
};

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Calculate due amount
 * @param {number} totalAmount - Total amount
 * @param {number} amountPaid - Amount paid
 * @returns {number} Due amount
 */
const calculateDueAmount = (totalAmount, amountPaid) => {
  return Math.max(0, totalAmount - amountPaid);
};

/**
 * Calculate age from DOB
 * @param {Date} dob - Date of birth
 * @returns {number} Age in years
 */
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = {
  getWhatsAppLink,
  calculateExpiryDate,
  formatDate,
  calculateDueAmount,
  calculateAge
};