let httpRequest;

function sendRequest(method, url) {
	httpRequest = new XMLHttpRequest()
	if (!httpRequest) {
		alert('Giving up :-( Cannot create an XMLHTTP instance');
		return false;
	}
	httpRequest.onreadystatechange = alertContents;
	httpRequest.open(method, url);
	httpRequest.send();
}

function alertContents() {
	if (httpRequest.readyState === XMLHttpRequest.DONE) {
		if (httpRequest.status === 200) {
			alert(httpRequest.responseText);
		} else {
			alert('There was a problem with the request. ' + httpRequest.status + " " +
				httpRequest.statusText);
		}
	}
}
