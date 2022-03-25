// Send PUT request
document.getElementById("submitAddRequest").onclick = function () {
	const datasetId = document.getElementById("addIdInput").value;
	const datasetKind = document.getElementById("addKindInput").value;
	const datasetFile = document.getElementById("fileInput");
	const requestOptions = {
		method: 'PUT',
		redirect: 'follow',
		headers: {
			'Content-Type':  'application/x-zip-compressed'
		},
		body: datasetFile.files[0]
	};

	fetch("http://localhost:4321/dataset/" + datasetId + "/" + datasetKind, requestOptions)
		.then(response => response.text())
		.then(result => document.getElementById("addResult").innerText = result.toString())
		.catch(error => alert(error));

	// TODO improve output of success or error
	// TODO change front-end for kind input to only have "courses" / "rooms"
	//
};
