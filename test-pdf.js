const url = "https://script.google.com/a/macros/kamiyama.ac.jp/s/AKfycbxI5NRYuE_TldyonWz02AwItfTkz4Jkd1KbO4lrssPadArA6qHF2Pm9quMT4JLt8ABxtA/exec?apiKey=botTij-qywsyf-7qatza&fileId=1MSUBWe8gj_hq3gGhyVqEDTjl90JoOSlv";
fetch(url, { redirect: 'follow' })
  .then(res => res.text())
  .then(text => console.log(text.substring(0, 500)))
  .catch(err => console.error(err));
