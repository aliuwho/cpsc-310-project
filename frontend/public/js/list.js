// Submit GET request
document.getElementById("submitListDatasetRequest").onclick = function () {
	const requestOptions = {
		method: 'GET',
		redirect: 'follow'
	};
	fetch("http://localhost:4321/datasets", requestOptions)
		.then(response => response.text())
		.then(result => document.getElementById("listResult").innerText = result.toString())
		.catch(error => alert(error));

	// TODO create tabular view or print out error
};
