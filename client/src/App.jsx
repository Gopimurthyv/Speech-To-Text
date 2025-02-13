import { useEffect, useState } from 'react'
import './App.css'
import axios from 'axios'
import Main from './components/Main'

function App() {

  return (
    <>
      <section className='flex flex-col items-center justify-center  p-6 '>
        
        <Main />

      </section>
    </>
  )
}

export default App
