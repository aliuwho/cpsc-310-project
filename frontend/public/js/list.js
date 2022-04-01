// Submit GET request
document.getElementById("submitListDatasetRequest").onclick = function () {
	const requestOptions = {
		method: 'GET',
		redirect: 'follow'
	};
	fetch("http://localhost:4321/datasets", requestOptions)
		.then(response => response.json())
		.then(result => parseListResults(result.result))
		.catch(error => alert(error));
};

/**
 * Returns an HTML table row representing a dataset as a string
 * @param dataset
 * @returns {string}
 */
function createTableRow(dataset) {
	let tableString = '<tr>'
	for (let key in dataset) {
		tableString += createTableCell(dataset[key]);
	}
	tableString += '</tr>'
	return tableString;
}

/**
 * Returns an HTML table cell representing a dataset as a string
 * @param content
 * @returns {string}
 */
function createTableCell(content) {
	return '<td>' + content + '</td>'
}

// Creates a JSON table for the listDataset results
function parseListResults(insightDatasetResults) {
	let table = document.getElementById("listTable");
	let tableContentString = "<tr>\n" +
		"\t\t<th>Dataset ID</th>\n" +
		"\t\t<th>Kind</th>\n" +
		"\t\t<th>Number of Rows</th>\n" +
		"\t</tr>";
	for (const dataset of insightDatasetResults) {
		tableContentString += createTableRow(dataset);
	}
	table.innerHTML = tableContentString;
}
