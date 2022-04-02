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
		.then(response => response.json())
		.then(result => {
			if (result.result) {
				return document.getElementById("addResult").innerText = result.result + " was successfully added."
			} else {
				return alert(result.error);
			}
		})
		.catch(error => alert(error));

	// TODO improve output of success or error
	// TODO change front-end for kind input to only have "courses" / "rooms"
	//
};
