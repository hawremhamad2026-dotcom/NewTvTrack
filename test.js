const title = "Mr. Bean & Co.";
const titleWithAnd = title.replace(/&/g, ' And ');
const res = titleWithAnd.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
console.log(res);
