import './styles/home.css';

let Zino;

export default class Home {
	constructor(x, zino) {
		let _this = this || {};
		Zino = zino;

		_this.props = {
			addition: ''
		};
	}

	render(data) {
		return (
			<div class="home">
				<h1>Welcome!</h1>
				<p>If you can see this text, then the zino base component code is running on your server-{data.props.addition}side.</p>
			</div>
		);
	}

	onmount() {
		if (Zino.isBrowser) {
			setTimeout(() => {
				this.getHost().setProps('addition', ' and client-');
			}, 50);
		}
	}
}
