function arraysAreEqual(array1, array2) {
  if (array1.length !== array2.length) {
    return false;
  }

  return array1.every((obj1) => {
    const obj2 = array2.find((o) => o.id === obj1.id);
    return !!obj2; // convert obj2 to a boolean value
  });
}
