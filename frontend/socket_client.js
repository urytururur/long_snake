
//socket receiving endpoints
var socket = io();

socket.on('test', (message) {
  console.log(message)
});
//--------

//pre functions
function pre_send()
{
  let pre_message = document.querySelector("#testinput").value;
  send(pre_message);
}
//--------

//other
function send(message) {
  socket.emit('test', {
    message: message
  });
}
//--------