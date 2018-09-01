import React, { Component } from 'react';
import Jimp from 'jimp';
import axios from 'axios';

import './App.css';

const MACHINE_PARTS = ['x', 'y', 'width', 'height'];
const CONFIG_IMAGE  = '/configimage.jpg';
const ROOT_URL      = '/';

class App extends Component {

  state = {
    dragging : false,
    warning  : false,
    machine  : 'washer',
  }

  constructor(props) {
    super(props);

    this.selectMachine = this.selectMachine.bind(this);

    this.mouseDown = this.mouseDown.bind(this);
    this.mouseMove = this.mouseMove.bind(this);
    this.mouseUp   = this.mouseUp.bind(this);
    this.savePart  = this.savePart.bind(this);
  }

  componentDidMount() {
    this.loadState();
  }

  selectMachine(e) {
    this.setState({machine : e.target.value});
  }

  mouseDown(e) {
    this.setState(
      {
        [this.state.machine] : {
          x : e.pageX,
          y : e.pageY,
        },
        dragging : true
      }
    );
  }

  mouseMove(e) {

    if (this.state.dragging) {
      const machine = this.state.machine;
      const machineState = this.state[machine];

      this.setState(
        {
          [this.state.machine] : {
            ...machineState,
            //x      : Math.min(e.pageX, this.state[machine].x),
            //y      : Math.min(e.pageY, this.state[machine].y),
            width  : e.pageX - this.state[machine].x,
            height : e.pageY - this.state[machine].y,
          },
          warning   : this.state[machine].x > e.pageX || this.state[machine].y > e.pageY ? true : false
        }
      );
    }
  }

  mouseUp(e) {
    const machine      = this.state.machine;
    const machineState = this.state[machine];
    this.setState( { dragging : false, warning : false } );

    Jimp.read(CONFIG_IMAGE)
      .then( async laundry => {
        let colors = {r : 0, g : 0, b : 0};
        let pixels = 0;
        for (let x = machineState.x; x <= machineState.x + machineState.width; x++) {
          for (let y = machineState.y; y <= machineState.y + machineState.height; y++) {
            const pixel = Jimp.intToRGBA(laundry.getPixelColor(x, y));
            colors.r += pixel.r;
            colors.g += pixel.g;
            colors.b += pixel.b;
            pixels++;
          }
        }

        colors.r = Math.round(colors.r / pixels);
        colors.g = Math.round(colors.g / pixels);
        colors.b = Math.round(colors.b / pixels);

        this.setState({[machine] : {...machineState, colors}}, this.saveState);
      })
      .catch(err => this.setState({err}));
  }

  renderWasher() {
    return this.renderMachine('washer', 'blue');
  }

  renderDryer() {
    return this.renderMachine('dryer', 'red');
  }

  renderMachine(machine, color) {
    let machineState = this.state[machine];

    if (
         machineState        !== undefined
      && machineState.x      !== undefined
      && machineState.y      !== undefined
      && machineState.width  !== undefined
      && machineState.height !== undefined ) {
        return (
          <rect
            x     = { machineState.x      }
            y     = { machineState.y      }
            width = { machineState.width  }
            height= { machineState.height }
            fill  = 'none'
            stroke= { color } />
        )
    }
    else { return null }
  }

  savePart( machine, part, value ) {
    this.setState(
      {
        [machine] : {
          ...this.state[machine],
          [part] : value
        }
      },
      this.saveState
    );

  }

  renderMachineValues() {
    const machine    = this.state.machine;
    let machineState = this.state[machine];

    if (
         machineState        !== undefined
      && machineState.x      !== undefined
      && machineState.y      !== undefined
      && machineState.width  !== undefined
      && machineState.height !== undefined ) {
        let output = [];

        MACHINE_PARTS.forEach( part => {
          output.push(
            <div className='form-group row' key={part}>
              <label htmlFor={`${machine}-${part}`} className='col-2 col-form-label'>{part}</label>
              <div className='col-10'>
                <input
                  type='number'
                  className='form-control'
                  value={this.state[machine][part]}
                  onChange={(e) => this.savePart(machine, part, e.target.value)}
                />
              </div>
            </div>
          )
        });

        return (
          <div className='container-fluid'>
            <form>
              {output}
            </form>
            { machineState.colors && (
              <div className='row'>
                <div className='col-1'>R: { machineState.colors.r}</div>
                <div className='col-1'>G: { machineState.colors.g}</div>
                <div className='col-1'>B: { machineState.colors.b}</div>
              </div>
            )}
          </div>
        );
    }
    else { return null }
  }

  saveState() {

    const config = {
      washer : this.state.washer,
      dryer  : this.state.dryer
    }

    axios.post(`${ROOT_URL}/config`, config)
      .catch(err => this.setState({err}));
  }

  loadState() {
    axios.get(`${ROOT_URL}/config`)
      .then( response => this.setState(response.data) )
      .catch(err => this.setState({err : `Could not load state: ${err.message}`}));
  }

  render() {
    return (
      <div className="App">
        <div>
          <svg width='959' height='720'
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            onMouseDown={ this.mouseDown }
            onMouseMove={ this.mouseMove }
            onMouseUp  ={ this.mouseUp   }>
            <image xlinkHref={CONFIG_IMAGE} x="0" y="0" height="100%" width="100%"/>
            { this.renderWasher() }
            { this.renderDryer()  }
          </svg>
        </div>
        <div>
          { this.state.warning && (
            <div className='alert alert-info'>
              Please start drawing your boxes from the upper left corner!
            </div>
          )}
          { this.state.err && (
            <div className='alert alert-danger'>
              { this.state.err }
            </div>
          )}
          <select name='machine' className='form-control' onChange={ this.selectMachine } value={this.state.machine}>
            <option value='washer'>Washer</option>
            <option value='dryer'>Dryer</option>
          </select>
          { this.renderMachineValues() }
        </div>
      </div>
    );
  }
}

export default App;
