
import axios from 'axios';
import msgpack from 'msgpack-lite';
const BASE_URL = 'https://ciphersprint.pulley.com/';

const start = async (path, counter) => {
  if (counter > 40) {console.log("done") ; return response};
  console.log(`-----\n 
    🎉 LEVEL: ${counter} 
    path: ${path}\n`);
  let response 
  try {
    response = await get_encrypted_path(path);
  } catch (e) {
     return response
  };
 
  console.log(`💡 response:`);
  console.dir(response);
  let challenge_string = response.encrypted_path.split(/task_/)[1]; 
  console.log(`🤔 ${challenge_string}`);
  let next_path = "task_"

  switch (true){
    case response.encryption_method == "nothing":
      next_path = response.encrypted_path;
      break;

    case response.encryption_method ==  "encoded as base64":
      next_path += atob(challenge_string);
      break; 

    case  response.encryption_method.includes("inserted some non-hex characters"):  
      let clean = challenge_string.replace(/[^a-f0-9]/ig, "");
      next_path += clean;
      break;

    case response.encryption_method.includes("ASCII value of each character"):
      let matches = response.encryption_method.match(/added (-?)(\d+) to ASCII value of each character/)
      let sign = matches[1] == "-" ? "": "-";
      let add_number = Number([sign,matches[2]].join(''));
      next_path += dataToAscii(challenge_string.split(""), add_number);
      break;

    case response.encryption_method.includes("XOR"):
      next_path += hexEncode(xorDecrypt(decodeHex(challenge_string), "secret"));
      break;

    case response.encryption_method.includes("messagepack"):
      let msg_pack_match = response.encryption_method.match(/messagepack:\s*(.*)$/)[1];
      console.log(` match: ${msg_pack_match}`);
      let order = msgpack.decode(Buffer.from(msg_pack_match, 'base64'))
      let scrambled = challenge_string.split('');
      let result = [] ; 
      for (let i = 0; i < order.length; i++) { 
        result.splice(i, 0, scrambled[i]) 
      }
      next_path += result.join('');
      break;

    default:
      console.log(`⛔️ algorithm: ${response.encryption_method} not yet implemented`);
      break;
  }

  let then = new Date().getTime();
  let new_response = await start(next_path, counter+1);
  let now = new Date().getTime();
  console.log(`execution time for ${counter}: ${now - then}ms`);
  return new_response, counter
}




// ----------------------------------------------------------------
export const get_encrypted_path = async (path) => {
  const response = await axios.get(`${BASE_URL}/${path}`);
  console.log(response.status);
  if (response.status == 404) {console.log(`error with ${path}: 500`)}
  if (response.status!= 200) { console.log(`error with ${path}: ${response.status} ${response.statusText}`)};
  return response.data;
}

export const decodeHex = (hex) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

export const dataToAscii = (data, add_number = 0) => { 
  return data.map(c => String.fromCharCode(c.charCodeAt(0) + add_number)).join(""); 
}

export const hexEncode = (data) => {
  const result =  data.map(c => c.toString(16).padStart(2,"0")).join(""); 
  return result;
}

export const xorDecrypt = (data, key) => {
  const keyBytes = Array.from(key).map(char => char.charCodeAt(0));
  const result =  data.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]);
  return result;
}


try {
   await start("tucker@tuckerbradford.com", 0);
} catch (error) { }
