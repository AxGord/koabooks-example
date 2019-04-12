import Books from "./Books";

export default (data?:Books) => `
<form action="." method="POST" enctype="multipart/form-data">
    ${data ? '<input type="hidden" name="id" value="' + data.id + '"/>' : ''}
	<p>
		<label>Title</label>
		<input type="text" name="title" value="${data ? data.title : ''}"/>
	</p>
	<p>
		<label>Author</label>
		<input type="text" name="author" value="${data ? data.author : ''}"/>
	</p>
	<p>
		<label>Description</label>
		<textarea name="description">${data ? data.description : ''}</textarea>
	</p>
	<p>
		<label>Image</label>
		<input type="file" name="image"/>
	</p>
	<button>Submit</button>
</form>
`