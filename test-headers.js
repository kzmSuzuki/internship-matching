try {
  new Headers({
    'Content-Disposition': 'inline; filename="当日の対戦スケジュール.pdf"'
  });
  console.log("Success");
} catch(e) {
  console.error(e.message);
}
