

import React, { Component } from 'react';
import styled, { ThemeProvider, injectGlobal } from 'styled-components';
import Header from './Header';
import Meta from './Meta';

const theme = {
  green: '#537010',
  black: '#393939',
  darkGreen: '#2F4204',
  lightGreen: '#D1F877',
  pink: '#8D2C69',
  offWhite: '#DAE9B8',
  maxWidth: '1000px',
  bs: '0 12px 24px 0 rgba(0, 0, 0, 0.09)',
};

const StyledPage = styled.div`
  background: white;
  
`;

const Inner = styled.div`
  max-width: ${props => props.theme.maxWidth};
  margin: 0 auto;
  padding: 2rem;
`;

injectGlobal`
@font-face {
	font-family: 'radnika_next';
	src: url('/static/radnikanext-medium-webfont.woff2') format('woff2');
	font-weight: normal;
	font-style: normal;
}
  html {
	  box-sizing: border-box;
	  font-size: 10px;
  }
  *, *:before, *:after {
	  box-sizing: inherit;
  }
  body {
	  padding: 0;
	  margin: 0;
	  font-size: 1.5rem;
	  font-family: 'radnika_next';
	  line-height: 2;
  }
  a {
	  color: ${theme.black};
	  text-decoration: none;
  }
`;

class Page extends Component {
  render() {
    return (
      <ThemeProvider theme={theme}>
        <StyledPage>
          <Meta />
          <Header />
          <Inner>{this.props.children}</Inner>
        </StyledPage>
      </ThemeProvider>
    );
  }
}

export default Page;
