$(document).ready(function(event) {
	$("#GOP")("click", postGO);
	$("#GOG")("click", getGO);
});

var myXhr;

function postGO(){
	myXhr = new XMLHttpRequest();
	myXhr.onreadystatechange = readyState;
	myXhr.open("POST", "alterconsos");
	myXhr.send("rien");
}

function postGO(){
	myXhr = new XMLHttpRequest();
	myXhr.onreadystatechange = readyState;
	myXhr.open("GET", "alterconsos");
	myXhr.send("rien");
}

function readyState(){
	if(myXhr.readyState == 4){
		var m = "Status = " + myXhr.status + " - " + myXhr.responseText;
		// console.log(m);
		$("#RET").html(m);
	}
}
