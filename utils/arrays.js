function arraysAreEqual(array1, array2) {
  if (array1.length !== array2.length) {
    return false;
  }

  return array1.every(obj1 => {
    const obj2 = array2.find(o => o.id === obj1.id);
    return !!obj2; // convert obj2 to a boolean value
  });
}

function compareTwoObj(obj1, obj2) {
  if (Object.keys(obj1).length !== Object.keys(obj1).length) return false;

  for (let i = 0; i < Object.keys(obj1).length; i++) {
    let key = Object.keys(obj1)[i];

    if (obj1[key] === obj2[key]) continue;

    return false;
  }

  return true;
}

function areArraysOfObjEqual(array1, array2) {
  if (array1.length !== array2.length) {
    return false;
  }

  for (let i = 0; i < array1.length; i++) {
    if (!compareTwoObj(array1[i], array2[i])) return false;
  }

  return true;
}

module.exports = { arraysAreEqual, areArraysOfObjEqual, compareTwoObj };
