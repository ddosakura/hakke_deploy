/*
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Request, Response, Server};
use std::convert::Infallible;
use std::net::SocketAddr;

async fn handle(_req: Request<Body>) -> Result<Response<Body>, Infallible> {
  Ok(Response::new(Body::from("Hello World")))
}

#[tokio::main]
async fn main() {
  // Construct our SocketAddr to listen on...
  let addr = SocketAddr::from(([127, 0, 0, 1], 8080));

  // And a MakeService to handle each connection...
  let make_service = make_service_fn(|_conn| async { Ok::<_, Infallible>(service_fn(handle)) });

  // Then bind and serve...
  let server = Server::bind(&addr).serve(make_service);

  // And run forever...
  if let Err(e) = server.await {
    eprintln!("server error: {}", e);
  }
}
*/

use hyper::{body::HttpBody as _, Client, Request, Uri};

#[tokio::main]
async fn main() {
  let client = Client::new();
  // Make a GET /ip to 'http://httpbin.org'
  let res = client
    .get(Uri::from_static("http://httpbin.org/ip"))
    .await?;
  // And then, if the request gets a response...
  println!("status: {}", res.status());
  // Concatenate the body stream into a single buffer...
  let buf = hyper::body::to_bytes(res).await?;
  println!("body: {:?}", buf);
}
