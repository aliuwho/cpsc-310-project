// Send DELETE request
document.getElementById("submitDeleteRequest").onclick = function () {
	const datasetId = document.getElementById("deleteIdInput").value;
	const requestOptions = {
		method: 'DELETE',
		redirect: 'follow'
	};
	fetch("http://localhost:4321/dataset/" + datasetId, requestOptions)
		.then(temp => temp)
		.then(response => response.json())
		.then(result => {
			if (result.result) {
				return document.getElementById("deleteResult").innerText = result.result + " was successfully deleted."
			} else {
				return alert(result.error);
			}
		})
		.catch(error => alert("Unexpected error: " + error));
};
