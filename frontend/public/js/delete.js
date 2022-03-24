// Send DELETE request
document.getElementById("submitDeleteRequest").onclick = function () {
	const datasetId = document.getElementById("deleteIdInput").value;
	const requestOptions = {
		method: 'DELETE',
		redirect: 'follow'
	};
	fetch("http://localhost:4321/dataset/" + datasetId, requestOptions)
		.then(response => response.text())
		.then(result => document.getElementById("deleteResult").innerText = result.toString())
		.catch(error => alert(error));

	// TODO improve output of success or error
	// TODO handle case where input breaks html request
};
